import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionInvoices, subscriptions } from "@/db/schema";
import { familyGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { dispatchParticipantNotification } from "@/lib/notifications/notification-service";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { paymentMethod, paymentReference, markAsPaid } = body;

    const [invoice] = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.id, params.id));

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ success: true, data: invoice, message: "Invoice is already paid" });
    }

    const now = new Date();

    // If direct payment confirmation (e.g. Telebirr, Chapa webhook or admin verification)
    if (markAsPaid || paymentMethod === "telebirr" || paymentMethod === "chapa") {
      const txId = paymentReference || `TXN-${paymentMethod?.toUpperCase() || "PAY"}-${Date.now()}`;

      const [updatedInvoice] = await db
        .update(subscriptionInvoices)
        .set({
          status: "paid",
          paymentMethod: paymentMethod || invoice.paymentMethod || "telebirr",
          paymentReference: txId,
          gatewayTransactionId: txId,
          paidAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptionInvoices.id, params.id))
        .returning();

      // Ensure subscription is active
      await db
        .update(subscriptions)
        .set({ status: "active", updatedAt: now })
        .where(eq(subscriptions.id, invoice.subscriptionId));

      const [subscription] = await db
        .select({ patientId: subscriptions.patientId, familyGroupId: subscriptions.familyGroupId })
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId));
      let patientId = subscription?.patientId || undefined;
      if (!patientId && subscription?.familyGroupId) {
        const [family] = await db
          .select({ primaryPatientId: familyGroups.primaryPatientId })
          .from(familyGroups)
          .where(eq(familyGroups.id, subscription.familyGroupId));
        patientId = family?.primaryPatientId || undefined;
      }

      if (patientId) {
        await dispatchParticipantNotification({
          patientId,
          category: "billing",
          type: "payment_received",
          title: "Subscription payment confirmed",
          body: `Subscription invoice ${invoice.invoiceNumber} was paid successfully. Your benefits remain active.`,
          priority: "normal",
          senderUserId: await getAuthenticatedSessionUserId(req) || undefined,
          actionUrl: `/subscriptions/${invoice.subscriptionId}`,
          actionText: "View subscription",
          relatedEntityType: "subscription_invoice",
          relatedEntityId: invoice.id,
          metadata: { workflowDomain: "subscription", subscriptionId: invoice.subscriptionId, invoiceNumber: invoice.invoiceNumber, transactionId: txId },
        });
      }

      return NextResponse.json({
        success: true,
        data: updatedInvoice,
        message: `Invoice ${invoice.invoiceNumber} successfully paid via ${paymentMethod || "gateway"}.`,
      });
    }

    // For manual bank transfer submission
    if (paymentMethod === "bank_transfer") {
      const [updatedInvoice] = await db
        .update(subscriptionInvoices)
        .set({
          paymentMethod: "bank_transfer",
          paymentReference: paymentReference || "PENDING_FINANCE_REVIEW",
          updatedAt: now,
        })
        .where(eq(subscriptionInvoices.id, params.id))
        .returning();

      const [subscription] = await db
        .select({ patientId: subscriptions.patientId, familyGroupId: subscriptions.familyGroupId })
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId));
      let patientId = subscription?.patientId || undefined;
      if (!patientId && subscription?.familyGroupId) {
        const [family] = await db
          .select({ primaryPatientId: familyGroups.primaryPatientId })
          .from(familyGroups)
          .where(eq(familyGroups.id, subscription.familyGroupId));
        patientId = family?.primaryPatientId || undefined;
      }

      if (patientId) {
        await dispatchParticipantNotification({
          patientId,
          category: "billing",
          type: "payment_pending",
          title: "Subscription payment submitted",
          body: `Bank transfer reference for subscription invoice ${invoice.invoiceNumber} was submitted and is awaiting verification.`,
          priority: "high",
          senderUserId: await getAuthenticatedSessionUserId(req) || undefined,
          actionUrl: `/subscriptions/${invoice.subscriptionId}`,
          actionText: "Track payment",
          relatedEntityType: "subscription_invoice",
          relatedEntityId: invoice.id,
          metadata: { workflowDomain: "subscription", subscriptionId: invoice.subscriptionId, invoiceNumber: invoice.invoiceNumber, paymentReference: paymentReference || "PENDING_FINANCE_REVIEW" },
        });
      }

      return NextResponse.json({
        success: true,
        data: updatedInvoice,
        message: "Bank transfer reference submitted. Awaiting finance verification.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid payment method" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

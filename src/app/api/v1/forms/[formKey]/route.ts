import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { formConfigurations, formFields, formSubmissions } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { formKey: string } }
) {
  try {
    const { formKey } = params;

    const [form] = await db
      .select()
      .from(formConfigurations)
      .where(and(eq(formConfigurations.formKey, formKey), eq(formConfigurations.isActive, true)));

    if (!form) {
      return NextResponse.json({ success: false, error: `Form '${formKey}' not found` }, { status: 404 });
    }

    const fields = await db
      .select()
      .from(formFields)
      .where(and(eq(formFields.formId, form.id), eq(formFields.isActive, true)))
      .orderBy(asc(formFields.order));

    return NextResponse.json({
      success: true,
      data: {
        ...form,
        fields,
      },
    });
  } catch (error: any) {
    console.error("[API v1 forms/[formKey] GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { formKey: string } }
) {
  try {
    const { formKey } = params;
    const body = await request.json();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const [form] = await db
      .select()
      .from(formConfigurations)
      .where(and(eq(formConfigurations.formKey, formKey), eq(formConfigurations.isActive, true)));

    if (!form) {
      return NextResponse.json({ success: false, error: `Form '${formKey}' not found` }, { status: 404 });
    }

    // Get expected fields for basic validation
    const fields = await db
      .select()
      .from(formFields)
      .where(and(eq(formFields.formId, form.id), eq(formFields.isActive, true)));

    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && (body[field.fieldName] === undefined || body[field.fieldName] === "" || body[field.fieldName] === null)) {
        errors[field.fieldName] = `${field.label} is required`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, error: "Validation failed", errors }, { status: 400 });
    }

    const [submission] = await db
      .insert(formSubmissions)
      .values({
        formKey,
        submittedByUserId: auth.user.id,
        data: body,
        status: "submitted",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Form submitted successfully",
      submissionId: submission.id,
      data: submission,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 forms/[formKey] POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

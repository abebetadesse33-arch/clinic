import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { formConfigurations, formFields } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formKey = searchParams.get("formKey");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];
    if (!all) {
      conditions.push(eq(formConfigurations.isActive, true));
    }
    if (formKey) {
      conditions.push(eq(formConfigurations.formKey, formKey));
    }

    let formsQuery = db.select().from(formConfigurations);
    if (conditions.length > 0) {
      // @ts-ignore
      formsQuery = formsQuery.where(and(...conditions));
    }

    const forms = await formsQuery;

    // For each form, load its active fields
    const formsWithFields = await Promise.all(
      forms.map(async (form) => {
        const fields = await db
          .select()
          .from(formFields)
          .where(and(eq(formFields.formId, form.id), eq(formFields.isActive, true)))
          .orderBy(asc(formFields.order));
        return {
          ...form,
          fields,
        };
      })
    );

    if (formKey && formsWithFields.length > 0) {
      return NextResponse.json({
        success: true,
        data: formsWithFields[0],
      });
    }

    return NextResponse.json({
      success: true,
      data: formsWithFields,
      count: formsWithFields.length,
    });
  } catch (error: any) {
    console.error("[API v1 forms GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formKey, title, description, submitLabel, actionEndpoint, isActive, fields } = body;

    if (!formKey || !title) {
      return NextResponse.json({ success: false, error: "formKey and title are required" }, { status: 400 });
    }

    const [form] = await db
      .insert(formConfigurations)
      .values({
        formKey,
        title,
        description: description || null,
        submitLabel: submitLabel || "Submit",
        actionEndpoint: actionEndpoint || null,
        isActive: isActive !== false,
      })
      .returning();

    let createdFields: any[] = [];
    if (Array.isArray(fields) && fields.length > 0) {
      const fieldValues = fields.map((f: any, idx: number) => ({
        formId: form.id,
        fieldName: f.fieldName,
        label: f.label || f.fieldName,
        fieldType: f.fieldType || "text",
        placeholder: f.placeholder || null,
        required: Boolean(f.required),
        options: f.options || [],
        validation: f.validation || {},
        order: typeof f.order === "number" ? f.order : idx,
        defaultValue: f.defaultValue || null,
        isActive: f.isActive !== false,
      }));

      createdFields = await db.insert(formFields).values(fieldValues).returning();
    }

    const result = { ...form, fields: createdFields };
    broadcastConfigChange("forms", "created", result);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 forms POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, fields, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Form ID is required" }, { status: 400 });
    }

    const [updatedForm] = await db
      .update(formConfigurations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(formConfigurations.id, id))
      .returning();

    if (!updatedForm) {
      return NextResponse.json({ success: false, error: "Form not found" }, { status: 404 });
    }

    // If fields array was provided, replace or sync fields
    if (Array.isArray(fields)) {
      await db.delete(formFields).where(eq(formFields.formId, id));
      if (fields.length > 0) {
        const fieldValues = fields.map((f: any, idx: number) => ({
          formId: id,
          fieldName: f.fieldName,
          label: f.label || f.fieldName,
          fieldType: f.fieldType || "text",
          placeholder: f.placeholder || null,
          required: Boolean(f.required),
          options: f.options || [],
          validation: f.validation || {},
          order: typeof f.order === "number" ? f.order : idx,
          defaultValue: f.defaultValue || null,
          isActive: f.isActive !== false,
        }));
        await db.insert(formFields).values(fieldValues);
      }
    }

    const currentFields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, id))
      .orderBy(asc(formFields.order));

    const result = { ...updatedForm, fields: currentFields };
    broadcastConfigChange("forms", "updated", result);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[API v1 forms PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Form ID is required" }, { status: 400 });
    }

    await db.delete(formConfigurations).where(eq(formConfigurations.id, id));

    broadcastConfigChange("forms", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 forms DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

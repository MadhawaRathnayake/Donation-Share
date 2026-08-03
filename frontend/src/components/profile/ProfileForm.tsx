import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, HandHeart, Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Profile, ProfileInput, SelectableRole } from "../../types/domain";
import { Button, FormField, Input, Textarea } from "../ui";
import { classNames } from "../../lib/format";

const schema = z
  .object({
    role: z.enum(["Donor", "Recipient", "Volunteer"]),
    phone: z.string().trim().min(5, "Enter a valid contact number.").max(40),
    address: z.string().trim().min(5, "Enter a complete address.").max(300),
    organizationName: z.string().trim().max(120).optional(),
    contactPerson: z.string().trim().max(120).optional(),
    taxId: z.string().trim().max(80).optional(),
    operatingHours: z.string().trim().max(200).optional(),
    serviceArea: z.string().trim().max(200).optional(),
    fullName: z.string().trim().max(120).optional(),
    availability: z.string().trim().max(200).optional(),
  })
  .superRefine((value, context) => {
    const required = (field: keyof typeof value, message: string) => {
      if (!value[field])
        context.addIssue({ code: "custom", path: [field], message });
    };
    if (value.role === "Volunteer") {
      required("fullName", "Enter your full name.");
      required("availability", "Describe when you are available.");
    } else {
      required("organizationName", "Enter the organization name.");
      required("contactPerson", "Enter a contact person.");
      required("taxId", "Enter the organization tax or registration ID.");
      required("operatingHours", "Enter operating hours.");
      if (value.role === "Recipient")
        required("serviceArea", "Enter the area your organization serves.");
    }
  });

type Values = z.infer<typeof schema>;

const defaults = (profile?: Profile): Values => ({
  role: profile?.role || "Donor",
  phone: profile?.phone || "",
  address: profile?.address || "",
  organizationName:
    profile && "organizationName" in profile ? profile.organizationName : "",
  contactPerson:
    profile && "contactPerson" in profile ? profile.contactPerson : "",
  taxId: profile && "taxId" in profile ? profile.taxId : "",
  operatingHours:
    profile && "operatingHours" in profile ? profile.operatingHours : "",
  serviceArea: profile?.role === "Recipient" ? profile.serviceArea : "",
  fullName: profile?.role === "Volunteer" ? profile.fullName : "",
  availability: profile?.role === "Volunteer" ? profile.availability : "",
});

const toInput = (value: Values): ProfileInput =>
  value.role === "Volunteer"
    ? {
        role: value.role,
        phone: value.phone,
        address: value.address,
        fullName: value.fullName!,
        availability: value.availability!,
      }
    : value.role === "Recipient"
      ? {
          role: value.role,
          phone: value.phone,
          address: value.address,
          organizationName: value.organizationName!,
          contactPerson: value.contactPerson!,
          taxId: value.taxId!,
          operatingHours: value.operatingHours!,
          serviceArea: value.serviceArea!,
        }
      : {
          role: value.role,
          phone: value.phone,
          address: value.address,
          organizationName: value.organizationName!,
          contactPerson: value.contactPerson!,
          taxId: value.taxId!,
          operatingHours: value.operatingHours!,
        };

export function ProfileForm({
  profile,
  submitting,
  submitLabel,
  onSubmit,
}: {
  profile?: Profile;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (input: ProfileInput) => void;
}) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults(profile),
  });
  const role = watch("role");
  const chooseRole = (nextRole: SelectableRole) =>
    setValue("role", nextRole, { shouldValidate: true });

  return (
    <form
      className="space-y-section"
      onSubmit={handleSubmit((value) => onSubmit(toInput(value)))}
      noValidate
    >
      {!profile && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">
            Choose how you will participate
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { role: "Donor", icon: Building2, text: "Share surplus food" },
                {
                  role: "Recipient",
                  icon: HandHeart,
                  text: "Receive food for a community",
                },
                { role: "Volunteer", icon: Truck, text: "Move food safely" },
              ] as const
            ).map((option) => (
              <button
                key={option.role}
                type="button"
                aria-pressed={role === option.role}
                onClick={() => chooseRole(option.role)}
                className={classNames(
                  "rounded-xl border-2 p-4 text-left transition focus-visible:outline",
                  role === option.role
                    ? "border-brand bg-brand text-white shadow-md"
                    : "border-stone-300 bg-white hover:border-brand hover:bg-brand-soft/40",
                )}
              >
                <option.icon size={23} />
                <strong className="mt-4 block">{option.role}</strong>
                <span
                  className={classNames(
                    "mt-1 block text-xs",
                    role === option.role ? "text-brand-soft" : "text-stone-500",
                  )}
                >
                  {option.text}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {profile && (
        <div className="rounded-lg border border-stone-300 bg-stone-100 px-4 py-3 text-sm">
          <strong>Account role:</strong> {role}. Contact an administrator to
          change this role.
        </div>
      )}
      <div className="grid gap-field sm:grid-cols-2">
        {role === "Volunteer" ? (
          <FormField
            label="Full name"
            htmlFor="fullName"
            required
            error={errors.fullName?.message}
          >
            <Input
              id="fullName"
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
          </FormField>
        ) : (
          <>
            <FormField
              label="Organization name"
              htmlFor="organizationName"
              required
              error={errors.organizationName?.message}
            >
              <Input
                id="organizationName"
                autoComplete="organization"
                aria-invalid={Boolean(errors.organizationName)}
                {...register("organizationName")}
              />
            </FormField>
            <FormField
              label="Contact person"
              htmlFor="contactPerson"
              required
              error={errors.contactPerson?.message}
            >
              <Input
                id="contactPerson"
                autoComplete="name"
                aria-invalid={Boolean(errors.contactPerson)}
                {...register("contactPerson")}
              />
            </FormField>
          </>
        )}
        <FormField
          label="Phone number"
          htmlFor="phone"
          required
          error={errors.phone?.message}
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </FormField>
        {role !== "Volunteer" && (
          <FormField
            label="Tax or registration ID"
            htmlFor="taxId"
            required
            error={errors.taxId?.message}
          >
            <Input
              id="taxId"
              aria-invalid={Boolean(errors.taxId)}
              {...register("taxId")}
            />
          </FormField>
        )}
      </div>
      <FormField
        label={
          role === "Volunteer" ? "Home area or address" : "Organization address"
        }
        htmlFor="address"
        required
        error={errors.address?.message}
      >
        <Textarea
          id="address"
          autoComplete="street-address"
          aria-invalid={Boolean(errors.address)}
          {...register("address")}
        />
      </FormField>
      {role === "Recipient" && (
        <FormField
          label="Service area"
          htmlFor="serviceArea"
          required
          error={errors.serviceArea?.message}
        >
          <Input
            id="serviceArea"
            placeholder="e.g. Colombo District"
            aria-invalid={Boolean(errors.serviceArea)}
            {...register("serviceArea")}
          />
        </FormField>
      )}
      {role === "Volunteer" ? (
        <FormField
          label="Availability"
          htmlFor="availability"
          required
          error={errors.availability?.message}
          hint="Include useful days and time ranges."
        >
          <Textarea
            id="availability"
            placeholder="Weekdays after 5 PM; weekends all day"
            aria-invalid={Boolean(errors.availability)}
            {...register("availability")}
          />
        </FormField>
      ) : (
        <FormField
          label="Operating hours"
          htmlFor="operatingHours"
          required
          error={errors.operatingHours?.message}
        >
          <Input
            id="operatingHours"
            placeholder="Monday–Friday, 08:00–17:00"
            aria-invalid={Boolean(errors.operatingHours)}
            {...register("operatingHours")}
          />
        </FormField>
      )}
      <div className="flex justify-end border-t border-stone-200 pt-6">
        <Button type="submit" size="lg" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

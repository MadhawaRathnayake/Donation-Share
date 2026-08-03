import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CircleCheck, PackagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  ConfirmDialog,
  DonationCard,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingSkeleton,
  MetricCard,
  Pagination,
  Select,
  Textarea,
} from "../components/ui";
import { services } from "../services";
import { useToast } from "../hooks/useToast";
import type { Donation, DonationInput } from "../types/domain";

const schema = z
  .object({
    foodType: z.string().min(1, "Choose a food type."),
    quantity: z.coerce
      .number()
      .int()
      .positive("Quantity must be greater than zero."),
    pickupLocation: z.string().trim().min(5, "Enter a pickup location."),
    pickupWindowStart: z.string().min(1, "Choose a pickup time."),
    expiryTime: z.string().min(1, "Choose an expiry time."),
    notes: z.string().max(500, "Keep notes below 500 characters.").optional(),
    image: z.instanceof(FileList).optional(),
  })
  .superRefine((value, context) => {
    const pickup = new Date(value.pickupWindowStart).getTime();
    const expiry = new Date(value.expiryTime).getTime();
    if (pickup <= Date.now())
      context.addIssue({
        code: "custom",
        path: ["pickupWindowStart"],
        message: "Pickup time must be in the future.",
      });
    if (expiry <= pickup)
      context.addIssue({
        code: "custom",
        path: ["expiryTime"],
        message: "Expiry must be after pickup.",
      });
  });
type Values = z.infer<typeof schema>;
type InputValues = z.input<typeof schema>;

export default function DonorDashboard() {
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Donation | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const donations = useQuery({
    queryKey: ["donations", "mine", page],
    queryFn: () => services.donations.mine(page),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InputValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      foodType: "",
      quantity: 1,
      pickupLocation: "",
      pickupWindowStart: "",
      expiryTime: "",
      notes: "",
    },
  });
  const create = useMutation({
    mutationFn: services.donations.create,
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["donations", "mine"] });
      toast.notify({
        tone: "success",
        title: "Donation published",
        message: "Recipients can now see this listing.",
      });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Donation could not be published",
        message: error.message,
      }),
  });
  const cancel = useMutation({
    mutationFn: services.donations.cancel,
    onSuccess: () => {
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast.notify({ tone: "success", title: "Donation cancelled" });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Cancellation failed",
        message: error.message,
      }),
  });
  const submit = (value: Values) => {
    const input: DonationInput = {
      foodType: value.foodType,
      quantity: value.quantity,
      pickupLocation: value.pickupLocation,
      pickupWindowStart: new Date(value.pickupWindowStart).toISOString(),
      expiryTime: new Date(value.expiryTime).toISOString(),
      notes: value.notes,
      image: value.image?.[0],
    };
    create.mutate(input);
  };
  const items = donations.data?.items || [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
          Donor workspace
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Share food while it is still useful.
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Publish an accurate collection window, then follow each donation
          through its full lifecycle.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total listings"
          value={String(donations.data?.total || 0)}
          icon={<Archive size={19} />}
        />
        <MetricCard
          label="Available now"
          value={String(
            items.filter((item) => item.status === "Posted").length,
          )}
          icon={<PackagePlus size={19} />}
        />
        <MetricCard
          label="Completed"
          value={String(
            items.filter((item) => item.status === "Delivered").length,
          )}
          icon={<CircleCheck size={19} />}
        />
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-2xl border border-brand/20 bg-white p-5 shadow-panel sm:p-7">
          <h3 className="text-xl font-black">Post a donation</h3>
          <p className="mt-1 text-sm text-stone-600">
            All fields marked with an asterisk are required.
          </p>
          <form
            className="mt-6 space-y-5"
            onSubmit={handleSubmit(submit)}
            noValidate
          >
            <FormField
              label="Food type"
              htmlFor="foodType"
              required
              error={errors.foodType?.message}
            >
              <Select id="foodType" {...register("foodType")}>
                <option value="">Select a category</option>
                <option>Fresh produce</option>
                <option>Prepared meals</option>
                <option>Bakery items</option>
                <option>Dry goods</option>
                <option>Dairy</option>
                <option>Other</option>
              </Select>
            </FormField>
            <FormField
              label="Quantity (portions)"
              htmlFor="quantity"
              required
              error={errors.quantity?.message}
            >
              <Input
                id="quantity"
                type="number"
                min="1"
                {...register("quantity")}
              />
            </FormField>
            <FormField
              label="Pickup location"
              htmlFor="pickupLocation"
              required
              error={errors.pickupLocation?.message}
            >
              <Input
                id="pickupLocation"
                autoComplete="street-address"
                {...register("pickupLocation")}
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Pickup starts"
                htmlFor="pickupWindowStart"
                required
                error={errors.pickupWindowStart?.message}
              >
                <Input
                  id="pickupWindowStart"
                  type="datetime-local"
                  {...register("pickupWindowStart")}
                />
              </FormField>
              <FormField
                label="Use before"
                htmlFor="expiryTime"
                required
                error={errors.expiryTime?.message}
              >
                <Input
                  id="expiryTime"
                  type="datetime-local"
                  {...register("expiryTime")}
                />
              </FormField>
            </div>
            <FormField
              label="Food image"
              htmlFor="image"
              hint="JPG, PNG, or WebP. Use a clear, naturally lit food photo."
            >
              <Input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                {...register("image")}
              />
            </FormField>
            <FormField
              label="Handling notes"
              htmlFor="notes"
              error={errors.notes?.message}
            >
              <Textarea
                id="notes"
                placeholder="Packaging, allergens, refrigeration, or access instructions"
                {...register("notes")}
              />
            </FormField>
            <Button
              className="w-full"
              type="submit"
              size="lg"
              loading={create.isPending}
            >
              <PackagePlus size={19} />
              Publish donation
            </Button>
          </form>
        </section>
        <section>
          <div className="mb-5">
            <h3 className="text-xl font-black">Donation history</h3>
            <p className="mt-1 text-sm text-stone-600">
              Your latest listings and their current status.
            </p>
          </div>
          {donations.isPending ? (
            <LoadingSkeleton rows={4} />
          ) : donations.isError ? (
            <ErrorState
              message="Donation history is unavailable."
              retry={() => donations.refetch()}
            />
          ) : items.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {items.map((donation) => (
                  <DonationCard
                    key={donation.id}
                    donation={donation}
                    action={
                      donation.status === "Posted" ? (
                        <Button
                          className="w-full"
                          variant="danger"
                          onClick={() => setCancelTarget(donation)}
                        >
                          Cancel listing
                        </Button>
                      ) : undefined
                    }
                  />
                ))}
              </div>
              <Pagination
                page={donations.data!.page}
                pageSize={donations.data!.pageSize}
                total={donations.data!.total}
                onPageChange={setPage}
              />
            </>
          ) : (
            <EmptyState
              title="No donations yet"
              description="Your published food donations will appear here."
            />
          )}
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this donation?"
        description="Recipients will no longer be able to claim it. This action cannot be reversed."
        confirmLabel="Cancel donation"
        loading={cancel.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancel.mutate(cancelTarget.id)}
      />
    </div>
  );
}

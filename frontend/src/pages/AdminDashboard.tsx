import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Check,
  Package,
  Search,
  Truck,
  Users,
  X,
} from "lucide-react";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  MetricCard,
  Pagination,
  Select,
  StatusBadge,
  type Column,
} from "../components/ui";
import { services } from "../services";
import { useToast } from "../hooks/useToast";
import { formatDateTime, formatNumber } from "../lib/format";
import type { AdminUser } from "../types/domain";

export default function AdminDashboard() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const queryClient = useQueryClient();
  const toast = useToast();
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: services.admin.stats,
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users", page, search, sort],
    queryFn: () => services.admin.users(page, search, sort),
  });
  const verify = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "Approved" | "Rejected";
    }) => services.admin.verifyUser(id, status),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.notify({
        tone: "success",
        title: `${user.name} ${user.verificationStatus.toLowerCase()}`,
      });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Approval update failed",
        message: error.message,
      }),
  });
  const columns = useMemo<Column<AdminUser>[]>(
    () => [
      {
        key: "user",
        header: "User",
        render: (user) => (
          <div>
            <strong className="block">{user.name}</strong>
            <span className="text-xs text-stone-500">{user.email}</span>
          </div>
        ),
      },
      { key: "role", header: "Role", render: (user) => user.role },
      {
        key: "status",
        header: "Verification",
        render: (user) => <StatusBadge status={user.verificationStatus} />,
      },
      {
        key: "created",
        header: "Joined",
        render: (user) => formatDateTime(user.createdAt),
      },
      {
        key: "actions",
        header: "Actions",
        render: (user) =>
          user.role === "Recipient" && user.verificationStatus === "Pending" ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={verify.isPending && verify.variables?.id === user.id}
                onClick={() =>
                  verify.mutate({ id: user.id, status: "Approved" })
                }
              >
                <Check size={15} />
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  verify.mutate({ id: user.id, status: "Rejected" })
                }
              >
                <X size={15} />
                Reject
              </Button>
            </div>
          ) : (
            <span className="text-xs text-stone-500">No action needed</span>
          ),
      },
    ],
    [verify],
  );

  return (
    <div className="space-y-9">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
          Administration
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Platform oversight
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Verify organizations and monitor the network’s operating health.
        </p>
      </div>
      {stats.isPending ? (
        <LoadingSkeleton rows={2} />
      ) : stats.isError ? (
        <ErrorState
          message="Platform statistics could not be loaded."
          retry={() => stats.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Food rescued"
            value={`${formatNumber(stats.data.totalFoodRescued)} portions`}
            icon={<Package size={19} />}
          />
          <MetricCard
            label="Active users"
            value={formatNumber(stats.data.activeUsers)}
            icon={<Users size={19} />}
          />
          <MetricCard
            label="Active donations"
            value={formatNumber(stats.data.activeDonations)}
            icon={<Activity size={19} />}
          />
          <MetricCard
            label="Completed deliveries"
            value={formatNumber(stats.data.completedDeliveries)}
            icon={<Truck size={19} />}
          />
        </div>
      )}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">Users and approvals</h3>
            <p className="mt-1 text-sm text-stone-600">
              Review recipient organizations before they can claim donations.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search users</span>
              <Search
                className="absolute left-3 top-3.5 text-stone-400"
                size={17}
              />
              <Input
                className="pl-9 sm:w-64"
                placeholder="Search name or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              <span className="sr-only">Sort users</span>
              <Select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="createdAt:desc">Newest first</option>
                <option value="name:asc">Name A–Z</option>
                <option value="name:desc">Name Z–A</option>
              </Select>
            </label>
          </div>
        </div>
        {usersQuery.isPending ? (
          <LoadingSkeleton rows={4} />
        ) : usersQuery.isError ? (
          <ErrorState
            message="Users could not be loaded."
            retry={() => usersQuery.refetch()}
          />
        ) : usersQuery.data.items.length ? (
          <>
            <DataTable
              columns={columns}
              items={usersQuery.data.items}
              rowKey={(user) => user.id}
            />
            <Pagination
              page={usersQuery.data.page}
              pageSize={usersQuery.data.pageSize}
              total={usersQuery.data.total}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            title="No users found"
            description="Try a different name, email, or role."
          />
        )}
      </section>
    </div>
  );
}

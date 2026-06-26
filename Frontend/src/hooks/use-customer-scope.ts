import { useMemo } from "react";
import { useAuth } from "@/app/auth";
import { useApiQuery } from "@/hooks/use-api-query";
import { adaptCustomer } from "@/lib/api-adapters";
import type { ApiCustomer } from "@/types/api";
import type { Customer } from "@/types/domain";

export function useCustomerScope() {
  const { session } = useAuth();
  const isCustomer = session?.role === "customer";

  const { data: customers } = useApiQuery<ApiCustomer[], Customer[]>({
    path: "/api/customers",
    transform: (r) => r.map(adaptCustomer),
    enabled: isCustomer,
  });

  const linkedCustomer = useMemo<Customer | null>(() => {
    if (!isCustomer || !customers?.length || !session?.username) return null;
    const match = customers.find(
      (c) => c.email?.toLowerCase() === session.username.toLowerCase()
    );
    return match ?? null;
  }, [isCustomer, customers, session?.username]);

  return {
    isCustomer,
    linkedCustomerId: linkedCustomer?.id ?? null,
    linkedCustomer,
    filterByCustomer: <T extends { customerId?: string; customer?: string }>(
      items: T[]
    ): T[] => {
      if (!isCustomer || !linkedCustomer) return items;
      const cid = linkedCustomer.id;
      return items.filter((item) => {
        if (item.customerId) return item.customerId === cid;
        return true;
      });
    },
  };
}

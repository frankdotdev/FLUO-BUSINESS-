import { MemoryStore } from "@fluo/core";
import { runStoreContract, type Harness } from "./store-contract.ts";

runStoreContract("MemoryStore", async (): Promise<Harness> => {
  const store = new MemoryStore();
  return {
    store,
    seedUser: async () => undefined,
    seedTicketType: async (a) => { store.ticketTypes.set(a.id, { id: a.id, eventId: a.eventId, businessId: a.businessId, eventName: "E", priceMinor: 0n, currency: "NGN", capacity: a.capacity, salesStartMs: null, salesEndMs: null, eventPublished: true }); },
    seedBookable: async (a) => { for (const id of a.resourceIds) store.resources.push({ id, businessId: a.businessId, groupId: a.groupId, label: id }); },
  };
});

import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";
import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { MultiSelect, MultiSelectContent, MultiSelectItem, MultiSelectTrigger, MultiSelectValue } from "@/components/MultiSelect";
import { Input } from "@/style/components/input";
import { Plus, X, Check } from "lucide-react";
import { useState } from "react";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

export function LoadoutPlan() {
  const {
    updateStartLoadout,
    addPendingProductSlot,
    updatePendingSlotCategory,
    removePendingProductSlot,
    addProductToLoadout,
    removeProductFromLoadout,
  } = useTechRoute();

  const services = useSelector(techRouteSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const startLoadout = useSelector(techRouteSelect.startLoadout);
  const pendingSlots = useSelector(techRouteSelect.pendingProductSlots);
  const productCategories = useSelector(techRouteSelect.productCategories);
  const productsForSlots = useSelector(techRouteSelect.productsForPendingSlots);

  // Local state for pending slot inputs
  const [pendingSlotProducts, setPendingSlotProducts] = useState<Record<string, ProductSub | ProductSingle | null>>({});
  const [pendingSlotAmounts, setPendingSlotAmounts] = useState<Record<string, string>>({});

  const handleAddPendingSlot = (masterId?: number) => {
    addPendingProductSlot(masterId);
  };

  const handleConfirmPendingSlot = (slotId: string) => {
    const product = pendingSlotProducts[slotId];
    const amountStr = pendingSlotAmounts[slotId];

    if (!product || !amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    addProductToLoadout(slotId, product, amount);

    // Clear local state for this slot
    setPendingSlotProducts((prev) => {
      const newState = { ...prev };
      delete newState[slotId];
      return newState;
    });
    setPendingSlotAmounts((prev) => {
      const newState = { ...prev };
      delete newState[slotId];
      return newState;
    });
  };

  const handleCancelPendingSlot = (slotId: string) => {
    removePendingProductSlot(slotId);

    // Clear local state for this slot
    setPendingSlotProducts((prev) => {
      const newState = { ...prev };
      delete newState[slotId];
      return newState;
    });
    setPendingSlotAmounts((prev) => {
      const newState = { ...prev };
      delete newState[slotId];
      return newState;
    });
  };
  console.log("LoadoutInventory", loadoutInventory);
  return (
    <div className={"flex flex-col gap-3"}>
      {loadoutInventory.masters.map((master) => {
        const masterProductId = master.product.productId;
        const masterAmountDisplay = master.product.unitConfigDisplay.format({
          amount: master.plannedAmount,
          targetContexts: ["load"],
          rounding: "ceil",
        }).formattedString;

        // Find corresponding master in startLoadout
        const startMaster = startLoadout.masters.find(m => m.product.productId === masterProductId);

        return (
          <div
            key={masterProductId}
            className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}
          >
            {/* Master Header */}
            <div className={"flex justify-between items-center"}>
              <div className={"text-xl font-bold text-foreground"}>
                {master.product.description}
              </div>
              <div className={"text-lg font-semibold text-foreground/80"}>
                {masterAmountDisplay}
              </div>
            </div>

            {/* AppMethods Section */}
            {master.appMethods.map((appMethod) => {
              const appMethodId = appMethod.appMethod.appMethodId;
              const mixProductAmountDisplay = appMethod.mixProduct.unitConfigDisplay.format({
                amount: appMethod.plannedAmount,
                targetContexts: ["load"],
                rounding: "ceil",
              }).formattedString;

              // Find corresponding appMethod in startLoadout
              const startAppMethod = startMaster?.appMethods.find(am => am.appMethod.appMethodId === appMethodId);

              return (
                <div
                  key={appMethodId}
                  className={"flex flex-col gap-2 ml-4 bg-accent/30 rounded-md p-2"}
                >
                  <div className={"text-lg font-semibold text-primary"}>
                    {appMethod.appMethod.description}
                  </div>

                  {/* MixProduct with Input */}
                  <div className={"flex items-center gap-2 ml-4"}>
                    <div className={"flex-1 text-sm text-foreground/90"}>
                      {appMethod.mixProduct.description}
                    </div>
                    <div className={"text-sm text-foreground/70"}>
                      Planned: {mixProductAmountDisplay}
                    </div>
                    <Input
                      type="number"
                      placeholder="Start amount"
                      className="w-24"
                      value={startAppMethod?.startAmount ?? ""}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        // Update specific appMethod startAmount
                        if (startMaster) {
                          const updatedMasters = startLoadout.masters.map(m => {
                            if (m.product.productId === masterProductId) {
                              return {
                                ...m,
                                appMethods: m.appMethods.map(am => {
                                  if (am.appMethod.appMethodId === appMethodId) {
                                    return { ...am, startAmount: value };
                                  }
                                  return am;
                                }),
                              };
                            }
                            return m;
                          });
                          updateStartLoadout({ masters: updatedMasters });
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Non-AppMethod Sub-Products */}
            {master.subProducts.length > 0 && (
              <div className={"flex flex-col gap-2 ml-4"}>
                <div className={"text-sm font-semibold text-foreground/60 uppercase"}>
                  Other Products
                </div>

                {master.subProducts.map((sub) => {
                  const subAmountDisplay = sub.product.unitConfigDisplay.format({
                    amount: sub.plannedAmount,
                    targetContexts: ["load", "app"],
                    rounding: "ceil",
                  }).formattedString;

                  // Find corresponding subProduct in startLoadout
                  const startSub = startMaster?.subProducts.find(s => s.product.productId === sub.product.productId);

                  return (
                    <div
                      key={sub.product.productId}
                      className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
                    >
                      <div className={"flex-1 text-sm text-foreground/90"}>
                        {sub.product.description}
                      </div>
                      <div className={"text-sm text-foreground/70"}>
                        Planned: {subAmountDisplay}
                      </div>
                      <Input
                        type="number"
                        placeholder="Start amount"
                        className="w-24"
                        value={startSub?.startAmount ?? ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          if (startMaster) {
                            const updatedMasters = startLoadout.masters.map(m => {
                              if (m.product.productId === masterProductId) {
                                return {
                                  ...m,
                                  subProducts: m.subProducts.map(s => {
                                    if (s.product.productId === sub.product.productId) {
                                      return { ...s, startAmount: value };
                                    }
                                    return s;
                                  }),
                                };
                              }
                              return m;
                            });
                            updateStartLoadout({ masters: updatedMasters });
                          }
                        }}
                      />
                      <button
                        onClick={() => removeProductFromLoadout(sub.product.productId, masterProductId)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Pending Slots for this Master */}
                {pendingSlots
                  .filter(slot => slot.masterId === masterProductId)
                  .map(slot => {
                    const availableProducts = productsForSlots.get(slot.id) ?? [];

                    return (
                      <div
                        key={slot.id}
                        className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
                      >
                        {/* Category Selector */}
                        <MultiSelect
                          mode="single"
                          value={slot.categoryFilter ? [slot.categoryFilter] : []}
                          onValueChange={(values) => {
                            updatePendingSlotCategory(slot.id, values[0] || null);
                          }}
                        >
                          <MultiSelectTrigger className="w-32">
                            <MultiSelectValue placeholder="Category" />
                          </MultiSelectTrigger>
                          <MultiSelectContent>
                            {productCategories.map(category => (
                              <MultiSelectItem key={category} value={category}>
                                {category}
                              </MultiSelectItem>
                            ))}
                          </MultiSelectContent>
                        </MultiSelect>

                        {/* Product Selector */}
                        <MultiSelect
                          mode="single"
                          value={pendingSlotProducts[slot.id] ? [pendingSlotProducts[slot.id]!] : []}
                          onValueChange={(values) => {
                            setPendingSlotProducts(prev => ({
                              ...prev,
                              [slot.id]: values[0] || null,
                            }));
                          }}
                          getValueKey={(product: ProductSub | ProductSingle) => String(product.productId)}
                          getDisplayValue={(product: ProductSub | ProductSingle) => product.description}
                        >
                          <MultiSelectTrigger className="flex-1">
                            <MultiSelectValue placeholder="Select product" />
                          </MultiSelectTrigger>
                          <MultiSelectContent>
                            {availableProducts.map(product => (
                              <MultiSelectItem key={product.productId} value={product}>
                                {product.description}
                              </MultiSelectItem>
                            ))}
                          </MultiSelectContent>
                        </MultiSelect>

                        {/* Amount Input */}
                        <Input
                          type="number"
                          placeholder="Amount"
                          className="w-24"
                          value={pendingSlotAmounts[slot.id] ?? ""}
                          onChange={(e) => {
                            setPendingSlotAmounts(prev => ({
                              ...prev,
                              [slot.id]: e.target.value,
                            }));
                          }}
                        />

                        {/* Confirm Button */}
                        <button
                          onClick={() => handleConfirmPendingSlot(slot.id)}
                          className="text-green-600 hover:text-green-700"
                          disabled={!pendingSlotProducts[slot.id] || !pendingSlotAmounts[slot.id]}
                        >
                          <Check className="h-4 w-4" />
                        </button>

                        {/* Cancel Button */}
                        <button
                          onClick={() => handleCancelPendingSlot(slot.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}

                {/* Add Button for this Master */}
                <button
                  onClick={() => handleAddPendingSlot(masterProductId)}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mt-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* CustomProducts Section */}
      {(startLoadout.singles.length > 0 || startLoadout.subProducts.length > 0 || pendingSlots.some(s => s.masterId === undefined)) && (
        <div className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}>
          <div className={"text-xl font-bold text-foreground"}>Additional Products</div>

          {/* Singles */}
          {startLoadout.singles.map(single => (
            <div
              key={single.product.productId}
              className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
            >
              <div className={"flex-1 text-sm text-foreground/90"}>
                {single.product.description}
              </div>
              <Input
                type="number"
                placeholder="Start amount"
                className="w-24"
                value={single.startAmount ?? ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : 0;
                  const updatedSingles = startLoadout.singles.map(s => {
                    if (s.product.productId === single.product.productId) {
                      return { ...s, startAmount: value };
                    }
                    return s;
                  });
                  updateStartLoadout({ singles: updatedSingles });
                }}
              />
              <button
                onClick={() => removeProductFromLoadout(single.product.productId)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* SubProducts */}
          {startLoadout.subProducts.map(sub => (
            <div
              key={sub.product.productId}
              className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
            >
              <div className={"flex-1 text-sm text-foreground/90"}>
                {sub.product.description}
              </div>
              <Input
                type="number"
                placeholder="Start amount"
                className="w-24"
                value={sub.startAmount ?? ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : 0;
                  const updatedSubProducts = startLoadout.subProducts.map(s => {
                    if (s.product.productId === sub.product.productId) {
                      return { ...s, startAmount: value };
                    }
                    return s;
                  });
                  updateStartLoadout({ subProducts: updatedSubProducts });
                }}
              />
              <button
                onClick={() => removeProductFromLoadout(sub.product.productId)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Pending Slots for CustomProducts */}
          {pendingSlots
            .filter(slot => slot.masterId === undefined)
            .map(slot => {
              const availableProducts = productsForSlots.get(slot.id) ?? [];

              return (
                <div
                  key={slot.id}
                  className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
                >
                  {/* Category Selector */}
                  <MultiSelect
                    mode="single"
                    value={slot.categoryFilter ? [slot.categoryFilter] : []}
                    onValueChange={(values) => {
                      updatePendingSlotCategory(slot.id, values[0] || null);
                    }}
                  >
                    <MultiSelectTrigger className="w-32">
                      <MultiSelectValue placeholder="Category" />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      {productCategories.map(category => (
                        <MultiSelectItem key={category} value={category}>
                          {category}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>

                  {/* Product Selector */}
                  <MultiSelect
                    mode="single"
                    value={pendingSlotProducts[slot.id] ? [pendingSlotProducts[slot.id]!] : []}
                    onValueChange={(values) => {
                      setPendingSlotProducts(prev => ({
                        ...prev,
                        [slot.id]: values[0] || null,
                      }));
                    }}
                    getValueKey={(product: ProductSub | ProductSingle) => String(product.productId)}
                    getDisplayValue={(product: ProductSub | ProductSingle) => product.description}
                  >
                    <MultiSelectTrigger className="flex-1">
                      <MultiSelectValue placeholder="Select product" />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      {availableProducts.map(product => (
                        <MultiSelectItem key={product.productId} value={product}>
                          {product.description}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>

                  {/* Amount Input */}
                  <Input
                    type="number"
                    placeholder="Amount"
                    className="w-24"
                    value={pendingSlotAmounts[slot.id] ?? ""}
                    onChange={(e) => {
                      setPendingSlotAmounts(prev => ({
                        ...prev,
                        [slot.id]: e.target.value,
                      }));
                    }}
                  />

                  {/* Confirm Button */}
                  <button
                    onClick={() => handleConfirmPendingSlot(slot.id)}
                    className="text-green-600 hover:text-green-700"
                    disabled={!pendingSlotProducts[slot.id] || !pendingSlotAmounts[slot.id]}
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => handleCancelPendingSlot(slot.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

          {/* Add Button for CustomProducts */}
          <button
            onClick={() => handleAddPendingSlot()}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mt-1"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      )}

      {/* Empty State */}
      {loadoutInventory.masters.length === 0 && (
        <div className={"text-center text-foreground/50 py-8"}>
          No products planned for selected services
        </div>
      )}
    </div>
  );
}

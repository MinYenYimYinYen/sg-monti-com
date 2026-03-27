export const MachineTypes = ["Truck", "RideOn"] as const;

export type Machine = {
  machineId: string;
  machineType: typeof MachineTypes[number];
  name: string;
}

export const machines: Machine[] = [
  { machineId: "truck1", machineType: "Truck", name: "Truck 1" },
  { machineId: "truck2", machineType: "Truck", name: "Truck 2" },
  { machineId: "truck3", machineType: "Truck", name: "Truck 3" },
  { machineId: "truck4", machineType: "Truck", name: "Truck 4" },
  { machineId: "truck5", machineType: "Truck", name: "Truck 5" },
  { machineId: "truck6", machineType: "Truck", name: "Truck 6" },
  { machineId: "truck7", machineType: "Truck", name: "Truck 7" },
  { machineId: "truck8", machineType: "Truck", name: "Truck 8" },
  { machineId: "truck9", machineType: "Truck", name: "Truck 9" },
  { machineId: "toro1", machineType: "RideOn", name: "Toro 1" },
  { machineId: "toro2", machineType: "RideOn", name: "Toro 2" },
  { machineId: "toro3", machineType: "RideOn", name: "Toro 3" },
  { machineId: "toro4", machineType: "RideOn", name: "Toro 4" },
  { machineId: "toro5", machineType: "RideOn", name: "Toro 5" },
  { machineId: "toro6", machineType: "RideOn", name: "Toro 6" },
  { machineId: "toro7", machineType: "RideOn", name: "Toro 7" },
  { machineId: "toro8", machineType: "RideOn", name: "Toro 8" },
  { machineId: "toro9", machineType: "RideOn", name: "Toro 9" },
];

export const trucks = machines.filter((m) => m.machineType === "Truck");
export const rideOns = machines.filter((m) => m.machineType === "RideOn");

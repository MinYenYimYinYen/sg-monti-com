"use client";



import { PromiseBuilder } from "@/app/schedPromise/PromiseBuilder";

export default function Routing() {
  // usePrintedCustomers({autoLoad: true});
  // useProgServ({autoLoad: true})
  // const services = useSelector(entitySelect.services("printed"));
  // console.log(services);
  return (
    <div>
      <div>Routing page</div>
      <PromiseBuilder />
    </div>
  );
}

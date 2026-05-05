import { ServiceEta } from "@/app/scheduling/eta/EtaTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ServiceEtaContract } from "@/app/scheduling/eta/api/ServiceEtaContract";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { serviceEtaSelect } from "@/app/scheduling/eta/serviceEtaSelect";

type ServiceEtaState = {
  serviceEtas: ServiceEta[];
};

const initialState: ServiceEtaState = {
  serviceEtas: [],
};

const serviceEtaSlice = createSlice({
  name: "serviceEta",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getServiceEtas.fulfilled, (state, action) => {
      const incoming = action.payload;
      const existingMap = new Grouper(state.serviceEtas).toUniqueMap(
        (d) => d.servId,
      );
      incoming.forEach((doc) => existingMap.set(doc.servId, doc));
      state.serviceEtas = Array.from(existingMap.values());
    });
    builder.addCase(saveServiceEta.fulfilled, (state, action) => {
      const updated = action.payload;
      const filtered = state.serviceEtas.filter(
        (d) => d.servId !== updated.servId,
      );
      state.serviceEtas = [...filtered, updated];
    });
  },
});

const getServiceEtas = createStandardThunk<
  ServiceEtaContract,
  "getServiceEtas"
>({
  typePrefix: "serviceEta/getServiceEtas",
  apiPath: "/scheduling/eta/api",
  opName: "getServiceEtas",
  transformParams: (params, getState) => {
    const existingMap = serviceEtaSelect.serviceEtaMap(getState() as AppState);
    const unloaded = params.servIds.filter((id) => !existingMap.has(id));
    return { servIds: unloaded };
  },
  customCondition: (config) => {
    return config.params.servIds.length > 0;
  },
});

const saveServiceEta = createStandardThunk<
  ServiceEtaContract,
  "saveServiceEta"
>({
  typePrefix: "serviceEta/saveServiceEta",
  apiPath: "/scheduling/eta/api",
  opName: "saveServiceEta",
});

export const serviceEtaReducer = serviceEtaSlice.reducer;
export const serviceEtaActions = {
  ...serviceEtaSlice.actions,
  getServiceEtas,
  saveServiceEta,
};

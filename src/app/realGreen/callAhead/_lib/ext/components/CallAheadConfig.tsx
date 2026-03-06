import { Modal, ModalProps } from "@/components/Modal";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { useSelector } from "react-redux";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";
import { KeywordCreate } from "./KeywordCreate";
import { KeywordEdit } from "./KeywordEdit";
import { callAheadSelect } from "@/app/realGreen/callAhead/selectors/callAheadSelect";
import { DocPropsConfig } from "@/app/realGreen/callAhead/_lib/ext/components/DocPropsConfig";

export function CallAheadConfig(props: ModalProps) {
  const { isOpen, onClose } = props;
  useCallAhead({ autoLoad: true });
  const keywordMap = useSelector(keywordSelect.keywordMap);
  const callAheadDocs = useSelector(callAheadSelect.callAheadDocs);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={"h-[75vh] w-[75vw]"}
      title={"Call-Ahead Config"}
    >
      <Tabs defaultValue={"config"}>
        <TabsList>
          <TabsTrigger value={"config"}>Config</TabsTrigger>
          <TabsTrigger value={"keywords"}>Keyword Messages</TabsTrigger>
        </TabsList>
        <TabsContent value={"config"}>
          {callAheadDocs.map((doc) => (
            <DocPropsConfig
              key={doc.callAheadId}
              callAheadId={doc.callAheadId}
            />
          ))}
        </TabsContent>
        <TabsContent value={"keywords"}>
          <div className={"flex flex-col gap-4"}>
            <KeywordCreate />
            {Array.from(keywordMap.keys()).map((keyword) => {
              return <KeywordEdit key={keyword} keywordId={keyword} />;
            })}
          </div>
        </TabsContent>
      </Tabs>
    </Modal>
  );
}

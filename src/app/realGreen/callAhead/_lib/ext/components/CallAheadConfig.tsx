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

export function CallAheadConfig(props: ModalProps) {
  const { isOpen, onClose } = props;
  useCallAhead({ autoLoad: true });
  const keywordMap = useSelector(keywordSelect.keywordMap);



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
        <TabsContent value={"config"}></TabsContent>
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

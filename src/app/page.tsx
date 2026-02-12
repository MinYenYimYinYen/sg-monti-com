"use client";

import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/style/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/style/components/tabs";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/style/components/select";
import { Separator } from "@/style/components/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/style/components/table";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/style/components/sheet";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { useEffect, useState } from "react";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useTaxCode } from "@/app/realGreen/taxCode/useTaxCode";
import { taxCodeSelect } from "@/app/realGreen/taxCode/taxCodeSelectors";
import { DatePicker } from "@/components/DatePicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { callAheadSelect } from "@/app/realGreen/callAhead/selectors/callAheadSelect";
import { useDiscount } from "@/app/realGreen/discount/useDiscount";
import { discountSelect } from "@/app/realGreen/discount/selectors/discountSelect";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import {useLastSeasonProduction} from "@/app/realGreen/customer/hooks/useLastSeasonProduction";

export default function Home() {
  // NEW: Declare contexts first
  useCustomerContext({ contexts: ["printed", "active", "lastSeasonProduction"] });


  // useActiveCustomers({ autoLoad: true });
  // useLastSeasonProduction({autoLoad: true});
  useProgServ({ autoLoad: true });

  useTaxCode({ autoLoad: true });
  useCallAhead({ autoLoad: true });
  useDiscount({ autoLoad: true });
  const customers = useSelector(centralSelect.customers);
  const programs = useSelector(centralSelect.programs);
  const services = useSelector(centralSelect.services);
  const progCodes = useSelector(progServSelect.progCodes);
  const taxCodes = useSelector(taxCodeSelect.taxCodes);
  const callAheadDocs = useSelector(callAheadSelect.callAheadDocs);
  const discountDocs = useSelector(discountSelect.discountDocs);


  useEffect(() => {
    console.log("Customers:", customers);
  }, [customers]);

  useEffect(() => {
    console.log("Programs:", programs);
  }, [programs]);

  useEffect(() => {
    console.log("Services:", services);
  }, [services]);


  useEffect(() => {
    // console.log("ProgCodes:", progCodes);
  }, [progCodes]);

  useEffect(() => {
    // console.log("TaxCodes:", taxCodes);
  }, [taxCodes]);

  useEffect(() => {
    // console.log("CallAheadDocs:", callAheadDocs);
  }, [callAheadDocs]);

  useEffect(() => {
    // console.log("DiscountDocs:", discountDocs);
  }, [discountDocs]);

  const [date, setDate] = useState("");
  const [dateRange, setDateRange] = useState<TRange<string>>({
    min: "",
    max: "",
  });

  return (
    <div className="container mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-2">
          shadcn/ui Component Showcase
        </h1>
        <p className="text-muted-foreground">
          Testing all installed components with current theme
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Date Picker ({date})</h2>
        <DatePicker value={date} onChange={(date) => setDate(date || "")} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Date Range Picker ({dateRange.min} - {dateRange.max})
        </h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="outline">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge>Default Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                This is the card content area. You can put any content here.
              </p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Another Card</CardTitle>
              <CardDescription>With different content</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Cards are versatile containers for grouping related content.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tabs</h2>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Card>
              <CardContent className="pt-6">
                <p>Content for Tab 1</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab2">
            <Card>
              <CardContent className="pt-6">
                <p>Content for Tab 2</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab3">
            <Card>
              <CardContent className="pt-6">
                <p>Content for Tab 3</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Form Elements */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Elements</h2>
        <Card>
          <CardHeader>
            <CardTitle>Form Example</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="select">Select Option</Label>
              <Select>
                <SelectTrigger id="select">
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Accept terms and conditions</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button>Submit</Button>
          </CardFooter>
        </Card>
      </section>

      {/* Table */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Table</h2>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">John Doe</TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Jane Smith</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Pending</Badge>
                  </TableCell>
                  <TableCell>User</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Bob Johnson</TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Sheet */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Sheet (Drawer)</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>
                This is a sheet component. It slides in from the side.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <p>
                Sheet content goes here. You can put forms, lists, or any other
                content.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </section>

      {/* Separators */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Separators</h2>
        <div>
          <p>Content above separator</p>
          <Separator className="my-4" />
          <p>Content below separator</p>
        </div>
      </section>
    </div>
  );
}

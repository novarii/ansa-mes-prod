/**
 * Component Showcase - Dev Page
 *
 * Preview all shadcn/ui components with Tailwind CSS v4.
 * Access at /dev/components
 */

import React, { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  PageHeader,
} from '../../components';
// cn utility available from '@/lib/utils' if needed

export function ComponentShowcase(): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">
      <PageHeader
        title="Component Showcase"
        subtitle="shadcn/ui + Tailwind CSS v4"
      />

      <div className="space-y-12 max-w-5xl">
        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">🔥</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled>Disabled</Button>
            <Button variant="default">Primary Action</Button>
            <Button variant="destructive">Danger Action</Button>
          </div>
        </section>

        <Separator />

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="default">Default Input</Label>
              <Input id="default" placeholder="Enter text..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disabled">Disabled</Label>
              <Input id="disabled" disabled placeholder="Disabled" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="error">With Error</Label>
              <Input id="error" aria-invalid="true" placeholder="Error state" />
              <p className="text-sm text-destructive">Bu alan zorunludur</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Number</Label>
              <Input id="number" type="number" placeholder="0" />
            </div>
          </div>
        </section>

        <Separator />

        {/* Select */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Select</h2>
          <div className="max-w-xs">
            <Label>Machine Selection</Label>
            <Select>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Makine secin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="machine1">Makine 1</SelectItem>
                <SelectItem value="machine2">Makine 2</SelectItem>
                <SelectItem value="machine3">Makine 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>With title and description</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Card content goes here. This is a basic card.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>With Footer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card has a footer with actions.
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm">Save</Button>
              </CardFooter>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Clickable Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card has hover effects.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Table</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">001</TableCell>
                  <TableCell>Work Order Alpha</TableCell>
                  <TableCell><Badge>Active</Badge></TableCell>
                  <TableCell className="text-right">1,500</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">002</TableCell>
                  <TableCell>Work Order Beta</TableCell>
                  <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                  <TableCell className="text-right">2,300</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">003</TableCell>
                  <TableCell>Work Order Gamma</TableCell>
                  <TableCell><Badge variant="outline">Completed</Badge></TableCell>
                  <TableCell className="text-right">800</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>

        <Separator />

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <Separator />

        {/* Tabs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Tabs</h2>
          <Tabs defaultValue="tab1" className="max-w-md">
            <TabsList>
              <TabsTrigger value="tab1">Detaylar</TabsTrigger>
              <TabsTrigger value="tab2">Uretim</TabsTrigger>
              <TabsTrigger value="tab3">Gecmis</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="p-4 border rounded-b-lg">
              <p className="text-sm text-muted-foreground">Tab 1 content - Work order details</p>
            </TabsContent>
            <TabsContent value="tab2" className="p-4 border rounded-b-lg">
              <p className="text-sm text-muted-foreground">Tab 2 content - Production entries</p>
            </TabsContent>
            <TabsContent value="tab3" className="p-4 border rounded-b-lg">
              <p className="text-sm text-muted-foreground">Tab 3 content - History</p>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* Alerts */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Alerts</h2>
          <div className="space-y-3 max-w-xl">
            <Alert>
              <AlertTitle>Bilgi</AlertTitle>
              <AlertDescription>
                Bu bir bilgi mesajidir.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>
                Bir hata olustu. Lutfen tekrar deneyin.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        <Separator />

        {/* Spinners */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Spinners</h2>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-muted-foreground">Small</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <span className="text-xs text-muted-foreground">Default</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-muted-foreground">Large</span>
            </div>
          </div>
          <div className="mt-4">
            <Spinner showLabel label="Yukleniyor..." />
          </div>
        </section>

        <Separator />

        {/* Dialog */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Dialog</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Example Dialog</DialogTitle>
                <DialogDescription>
                  This is a shadcn/ui dialog component. Click outside or press Escape to close.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Dialog content goes here. You can put forms, confirmations, or any content.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Iptal
                </Button>
                <Button onClick={() => setDialogOpen(false)}>
                  Kaydet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        <Separator />

        {/* Color Palette */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-primary text-primary-foreground text-center text-sm">Primary</div>
            <div className="p-4 rounded-lg bg-secondary text-secondary-foreground text-center text-sm">Secondary</div>
            <div className="p-4 rounded-lg bg-destructive text-destructive-foreground text-center text-sm">Destructive</div>
            <div className="p-4 rounded-lg bg-muted text-muted-foreground text-center text-sm">Muted</div>
            <div className="p-4 rounded-lg bg-accent text-accent-foreground text-center text-sm">Accent</div>
            <div className="p-4 rounded-lg bg-success text-success-foreground text-center text-sm">Success</div>
            <div className="p-4 rounded-lg bg-warning text-warning-foreground text-center text-sm">Warning</div>
            <div className="p-4 rounded-lg bg-card text-card-foreground border text-center text-sm">Card</div>
          </div>
        </section>
      </div>
    </div>
  );
}

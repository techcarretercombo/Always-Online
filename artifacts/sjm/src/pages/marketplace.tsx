import { useState } from "react";
import { useListProducts, useCreateProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Search, MapPin, Tag } from "lucide-react";
import { useForm } from "react-hook-form";

const CATEGORIES = ["Electronics", "Clothing", "Books", "Furniture", "Vehicles", "Sports", "Food", "Other"];

export default function MarketplacePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [open, setOpen] = useState(false);
  const { data: products, isLoading } = useListProducts({ search: search || undefined, category: category || undefined });
  const createProduct = useCreateProduct();
  const form = useForm({
    defaultValues: { title: "", description: "", price: "", category: "Other", condition: "good", location: "" },
  });

  function handleCreate(data: any) {
    createProduct.mutate({ data: { ...data, price: parseFloat(data.price) } }, {
      onSuccess: () => {
        toast({ title: "Product listed!" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      },
      onError: () => toast({ title: "Failed to list product", variant: "destructive" }),
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Buy and sell within your community</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} />List Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>List a new item</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="What are you selling?" {...form.register("title", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Describe your item..." {...form.register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price ($)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" {...form.register("price", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Condition</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" {...form.register("condition")}>
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" {...form.register("category")}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input placeholder="Your city or area" {...form.register("location")} />
              </div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                {createProduct.isPending ? "Listing..." : "List Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search items..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs w-40"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-0">
              <Skeleton className="w-full aspect-square rounded-t-xl" />
              <div className="p-3 space-y-2">
                <Skeleton className="w-3/4 h-3.5" />
                <Skeleton className="w-1/3 h-5" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : (products ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No items found</p>
          <p className="text-sm">Be the first to list something!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(products ?? []).map((product: any) => (
            <Card key={product.id} className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted relative overflow-hidden">
                {product.imageUrls?.length > 0 ? (
                  <img src={product.imageUrls[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={32} className="text-muted-foreground/30" />
                  </div>
                )}
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="secondary">Sold</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <p className="font-semibold text-sm truncate">{product.title}</p>
                <p className="text-lg font-bold text-primary mt-0.5">${parseFloat(product.price).toFixed(2)}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag size={11} />
                    {product.category}
                  </div>
                  {product.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} />
                      {product.location}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

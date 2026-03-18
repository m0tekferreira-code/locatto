import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { SlidersHorizontal } from "lucide-react";

interface FilterDrawerProps {
  children: ReactNode;
  onClear?: () => void;
}

export const FilterDrawer = ({ children, onClear }: FilterDrawerProps) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full md:hidden">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filtros</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
        <DrawerFooter className="flex-row gap-2">
          {onClear && (
            <Button variant="outline" onClick={onClear} className="flex-1">
              Limpar
            </Button>
          )}
          <DrawerClose asChild>
            <Button className="flex-1">Aplicar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

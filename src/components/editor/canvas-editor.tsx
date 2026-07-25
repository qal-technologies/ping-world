"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { 
  Type, 
  Image as ImageIcon, 
  Palette, 
  Trash2, 
  Download, 
  ChevronDown,
  Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { saveAs } from "file-saver";

const FONTS = [
  "Space Grotesk",
  "Syne",
  "Inter",
  "JetBrains Mono",
  "Bebas Neue",
  "Playfair Display",
  "Roboto",
  "Montserrat"
];

const PRESET_GRADIENTS = [
  { name: "Brand", value: "linear-gradient(135deg, #5C6FFF 0%, #22D4FD 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #FFB347 0%, #FF5C7A 100%)" },
  { name: "Emerald", value: "linear-gradient(135deg, #22C985 0%, #22D4FD 100%)" },
  { name: "Deep", value: "linear-gradient(135deg, #12152E 0%, #1A1F40 100%)" },
];

export default function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: "#12152E",
    });

    setCanvas(fabricCanvas);

    // Initial text
    const text = new fabric.IText("Double click to edit text", {
      left: 250,
      top: 250,
      fontFamily: "Space Grotesk",
      fill: "#F8F9FF",
      fontSize: 24,
      originX: "center",
      originY: "center",
      textAlign: "center",
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText("New Text", {
      left: 100,
      top: 100,
      fontFamily: "Space Grotesk",
      fill: "#F8F9FF",
      fontSize: 24,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const changeFont = (font: string) => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      activeObject.set("fontFamily", font);
      canvas.renderAll();
    }
  };

  const setBackground = (color: string) => {
    if (!canvas) return;
    canvas.set({ backgroundColor: color });
    canvas.renderAll();
  };

  const deleteObject = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const exportImage = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    saveAs(dataURL, "pingworld-post.png");
    toast.success("Image exported!");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-w-[70vw]">
      {/* Canvas Toolbars */}
      <div className="flex flex-col gap-4 w-full lg:min-w-80 order-2 lg:order-1">
        <Card className="card-glow p-4 bg-pw-surface/50 border-white/5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Layout className="h-4 w-4 text-pw-primary" /> Elements
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={addText} className="h-10 bg-white/5 border-white/10 hover:bg-white/10 gap-2 text-xs">
              <Type className="h-4 w-4" /> Add Text
            </Button>
            <Button variant="outline" className="h-10 bg-white/5 border-white/10 hover:bg-white/10 gap-2 text-xs">
              <ImageIcon className="h-4 w-4" /> Add Image
            </Button>
          </div>
        </Card>

        <Card className="card-glow p-4 bg-pw-surface/50 border-white/5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-pw-primary" /> Styles
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-pw-muted uppercase font-bold tracking-wider mb-2 block">Font Family</label>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" className="w-full justify-between h-9 text-xs bg-white/5 border-white/10">
                    Select Font <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-pw-surface border-white/10">
                  {FONTS.map(font => (
                    <DropdownMenuItem 
                      key={font} 
                      onClick={() => changeFont(font)}
                      style={{ fontFamily: font }}
                      className="text-pw-text hover:bg-pw-primary/10"
                    >
                      {font}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <label className="text-[10px] text-pw-muted uppercase font-bold tracking-wider mb-2 block">Background</label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_GRADIENTS.map(grad => (
                  <button
                    key={grad.name}
                    onClick={() => setBackground(grad.value)}
                    className="h-8 rounded-md border border-white/10 overflow-hidden group transition-transform hover:scale-110"
                    style={{ background: grad.value }}
                    title={grad.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 mt-auto">
          <Button variant="destructive" onClick={deleteObject} className="flex-1 gap-2 h-10 text-xs">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" onClick={exportImage} className="flex-1 gap-2 h-10 text-xs border-pw-primary/20 hover:bg-pw-primary/5">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 grid items-center justify-center bg-pw-bg rounded-2xl border border-white/5 p-2 min-h-[80vh] order-1 lg:order-2 w-full aspect-video"
      >
        <div className="relative shadow-2xl rounded-lg overflow-hidden items-center border border-white/10 w-full" style={{placeSelf:'center'}}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

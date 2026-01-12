"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

interface SortableWidgetProps {
    id: string
    children: React.ReactNode
}

export function SortableWidget({ id, children }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 50 : 'auto',
    }

    return (
        <div ref={setNodeRef} style={style} className="group relative bg-background/50 rounded-xl">
            {/* Drag Handle - shows on hover */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary cursor-grab active:cursor-grabbing transition-all z-20 text-muted-foreground"
            >
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="h-full">
                {children}
            </div>
        </div>
    )
}

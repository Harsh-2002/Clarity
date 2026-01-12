import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export interface LinkExtensionOptions {
    onLinkClick: (title: string) => void
}

export const LinkExtension = Extension.create<LinkExtensionOptions>({
    name: "noteLink",

    addOptions() {
        return {
            onLinkClick: () => { },
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey("noteLink"),
                props: {
                    decorations: (state) => {
                        const { doc } = state
                        const decorations: Decoration[] = []
                        const regex = /\[\[([^\]]+)\]\]/g

                        doc.descendants((node, pos) => {
                            if (!node.isText) return

                            const text = node.text || ""
                            let match

                            while ((match = regex.exec(text)) !== null) {
                                const start = pos + match.index
                                const end = start + match[0].length
                                const title = match[1]

                                const decoration = Decoration.inline(start, end, {
                                    class: "inline-flex items-center mx-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded cursor-pointer hover:bg-primary/20 transition-colors font-medium border border-primary/20",
                                    "data-link-title": title,
                                })
                                decorations.push(decoration)
                            }
                        })

                        return DecorationSet.create(doc, decorations)
                    },
                    handleClick: (view, pos, event) => {
                        const target = event.target as HTMLElement
                        if (target.hasAttribute("data-link-title")) {
                            const title = target.getAttribute("data-link-title")
                            if (title) {
                                this.options.onLinkClick(title)
                                return true
                            }
                        }
                        return false
                    },
                },
            }),
        ]
    },
})

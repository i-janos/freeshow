<script lang="ts">
    import Textbox from "../components/Textbox.svelte"
    import { getAutoSize } from "../helpers/autoSize"

    export let slide: any
    export let parent: any
    export let chords: boolean = false
    export let autoSize: boolean = false
    export let autoStage: boolean = true
    export let fontSize: number = 0

    export let style: boolean = false

    $: stageAutoSize = autoSize ? (slide ? getAutoSize(slide.items[0], parent) : 1) : fontSize
    $: console.log(slide, slide?.items[0], parent)
    $: console.log("SIZE", autoSize, fontSize, stageAutoSize)

    $: items = style ? slide.items : combineSlideItems()

    function combineSlideItems() {
        let oneItem: any = null
        if (!slide?.items) return []
        JSON.parse(JSON.stringify(slide.items)).forEach((item: any) => {
            if (item.lines) {
                if (!oneItem) oneItem = item
                else oneItem.lines.push(...item.lines)
            }
        })

        return oneItem ? [oneItem] : []
    }
</script>

{#if slide}
    {#each items as item}
        <Textbox {item} {style} {chords} autoSize={stageAutoSize} {autoStage} />
    {/each}
{/if}

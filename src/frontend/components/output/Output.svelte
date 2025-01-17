<script lang="ts">
    import { OUTPUT, READ_EXIF } from "../../../types/Channels"
    import type { Styles } from "../../../types/Settings"
    import type { Transition } from "../../../types/Show"
    import { outputs, overlays, showsCache, styles, templates, transitionData, volume } from "../../stores"
    import { receive, send } from "../../utils/request"
    import { custom } from "../../utils/transitions"
    import Draw from "../draw/Draw.svelte"
    import { clone } from "../helpers/array"
    import { getActiveOutputs, getResolution } from "../helpers/output"
    import { _show } from "../helpers/shows"
    import Textbox from "../slide/Textbox.svelte"
    import Zoomed from "../slide/Zoomed.svelte"
    import MediaOutput from "./MediaOutput.svelte"

    export let video: any = null
    export let videoData: any = { duration: 0, paused: true, muted: false, loop: false }
    export let videoTime: number = 0
    export let title: string = ""
    export let mirror: boolean = false
    export let preview: boolean = false

    // $: if (currentOutput.isKeyOutput) mirror = true
    // $: console.log("MIRROR", mirror, currentOutput.isKeyOutput)

    // TODO: showing slide upon clear fade out will show black output (Transition bug!)
    // TODO: dont show transition upon no change!s
    export let transition: Transition = $transitionData.text
    export let mediaTransition: Transition = $transitionData.media
    export let disableTransitions: boolean = false
    export let style = ""
    export let center: boolean = false
    export let ratio: number = 0

    // out data
    const defaultLayers: string[] = ["background", "slide", "overlays"]
    $: outputId = getActiveOutputs($outputs, true, mirror)[0]
    $: currentOutput = $outputs[outputId] || {}

    let currentStyle: Styles = { name: "" }
    $: currentStyle = currentOutput?.style ? $styles[currentOutput?.style] || { name: "" } : { name: "" }

    let layers: any = currentStyle.layers || defaultLayers
    let out: any = currentOutput?.out || {}
    let slide: any = out.slide || null
    let background: any = out.background || null

    $: if (JSON.stringify(layers) !== JSON.stringify(currentStyle.layers || defaultLayers)) layers = JSON.parse(JSON.stringify(currentStyle.layers || defaultLayers))
    $: if (JSON.stringify(out) !== JSON.stringify(currentOutput?.out || {})) out = JSON.parse(JSON.stringify(currentOutput?.out || {}))
    $: if (out.refresh || outputId || JSON.stringify(slide) !== JSON.stringify(out.slide || null)) slide = JSON.parse(JSON.stringify(out.slide || null))
    $: if (out.refresh || outputId || JSON.stringify(background) !== JSON.stringify(out.background || null)) background = JSON.parse(JSON.stringify(out.background || null))

    // transition
    $: slideData = $showsCache && slide && slide.id !== "temp" ? _show(slide.id).layouts("active").ref()[0]?.[slide.index!]?.data : null
    $: slideTextTransition = slideData ? slideData.transition : null
    $: slideMediaTransition = slideData ? slideData.mediaTransition : null
    $: transition = disableTransitions ? { type: "none" } : slideTextTransition ? slideTextTransition : $transitionData.text
    $: mediaTransition = disableTransitions ? { type: "none" } : slideMediaTransition ? slideMediaTransition : $transitionData.media
    $: overlayTransition = disableTransitions ? { type: "none" } : $transitionData.text

    const receiveOUTPUT = {
        // MAIN_VIDEO_DATA: (a: any) => {
        //   if (!mirror) return
        //   videoData = a
        //   // if (a.paused && a.time) videoTime = a.time
        // },
        // MAIN_VIDEO_TIME: (a: number) => {
        //   if (!mirror) return
        //   setTime(a)
        // },
        MAIN_VIDEO: (a: any) => {
            if (a.id !== outputId) return
            if (a.data) videoData = a.data
            if (mirror && a.updatePreview !== true) return
            if (a.time !== undefined) setTime(a.time)
        },

        REQUEST_VIDEO_DATA: (a: string) => {
            if (mirror || a !== outputId) return
            // send(OUTPUT, ["MAIN_VIDEO_DATA"], )
            send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, data: videoData, time: videoTime })
            // let video load
            setTimeout(() => {
                send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, time: videoTime })
                setTimeout(() => {
                    send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, time: videoTime })
                }, 2000)
            }, 1500)
        },
        UPDATE_VIDEO: (a: any) => {
            if (mirror) return
            let returnData: any = { id: outputId }

            console.log("UPDATE", a)

            if (a.data) {
                videoData = a.data
                returnData.data = videoData
                setTimeout(() => {
                    send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, data: videoData })
                    // send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, data: videoData, time: videoTime })
                }, 300)
            }

            if (a.time !== undefined) {
                setTime(a.time)
                returnData.time = videoTime
                // returnData.updatePreview = true
            } else if (videoData.paused) {
                returnData.time = videoTime
                setTimeout(() => {
                    if (videoData.paused) send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, time: videoTime, updatePreview: a.updatePreview })
                }, 500)
            }

            send(OUTPUT, ["MAIN_VIDEO"], returnData)
        },
        BACKGROUND: (a: any) => {
            if (a?.loop) videoData.loop = a.loop
            if (mirror) return
            if (a?.muted) videoData.muted = a.muted
        },
        VOLUME: (a: any) => {
            if (mirror) return
            volume.set(a)
        },
    }

    // if ($currentWindow === "output" || mirror) receive(OUTPUT, receiveOUTPUT)
    receive(OUTPUT, receiveOUTPUT)

    function setTime(time: number) {
        let autoPaused: boolean = false
        if (!videoData.paused) {
            autoPaused = videoData.paused = true
        }

        // TODO: youtube seekTo
        setTimeout(() => {
            videoTime = time

            setTimeout(() => {
                if (autoPaused) videoData.paused = false
            }, 80)
        }, 10)

        if (background?.startAt !== undefined && mirror) {
            outputs.update((a) => {
                delete a[outputId].out?.background?.startAt
                return a
            })
        }
    }

    $: currentLayout = slide ? _show(slide.id).layouts([slide.layout]).ref()[0] : []
    $: currentSlide = slide && outputId ? (slide.id === "temp" ? { items: slide.tempItems } : currentLayout ? JSON.parse(JSON.stringify(_show(slide.id).slides([currentLayout[slide.index!].id]).get()[0] || {})) : null) : null

    $: if (currentSlide && currentOutput?.style && currentStyle) setTemplateStyle()
    function setTemplateStyle() {
        // TODO: duplicate of history "template":1107
        let template = $templates[currentStyle.template || ""]
        if (template?.items?.length) {
            template.items.forEach((item: any, i: number) => {
                if (currentSlide.items[i]) {
                    currentSlide.items[i].style = item.style || ""
                    currentSlide.items[i].align = item.align || ""
                    currentSlide.items[i].lines?.forEach((line: any, j: number) => {
                        let templateLine = item.lines?.[j] || item.lines?.[0]
                        line.align = templateLine?.align || ""
                        line.text?.forEach((text: any, k: number) => {
                            text.style = templateLine?.text[k] ? templateLine.text[k].style || "" : templateLine?.text[0]?.style || ""
                        })
                    })
                }
            })
        } else {
            // reset style
            currentSlide = slide && outputId ? (slide.id === "temp" ? { items: slide.tempItems } : currentLayout ? JSON.parse(JSON.stringify(_show(slide.id).slides([currentLayout[slide.index!].id]).get()[0] || {})) : null) : null
        }
    }

    $: resolution = getResolution(currentSlide?.settings?.resolution, { currentOutput, currentStyle })

    // lines
    let linesStart: null | number = null
    let linesEnd: null | number = null
    $: amountOfLinesToShow = currentStyle.lines !== undefined ? Number(currentStyle.lines) : 0
    $: linesIndex = amountOfLinesToShow && slide ? slide.line || 0 : null
    $: linesStart = linesIndex !== null ? amountOfLinesToShow! * linesIndex : null
    $: linesEnd = linesStart !== null ? linesStart + amountOfLinesToShow! : null

    // metadata
    $: autoMediaMeta = $showsCache[slide?.id]?.metadata?.autoMedia
    let metaMessage: { [key: string]: any } = {}
    $: metaMessage = autoMediaMeta ? {} : $showsCache[slide?.id]?.meta
    $: overrideOutput = $showsCache[slide?.id]?.metadata?.override
    $: metadataTemplate = overrideOutput ? $showsCache[slide?.id]?.metadata?.template : currentStyle.metadataTemplate || "metadata"
    $: metadataDisplay = overrideOutput ? $showsCache[slide?.id]?.metadata?.display : currentStyle.displayMetadata
    const defaultMetadataStyle = "top: 910px;left: 50px;width: 1820px;height: 150px;opacity: 0.8;font-size: 30px;text-shadow: 2px 2px 4px rgb(0 0 0 / 80%);"
    let metadataStyle = defaultMetadataStyle
    $: metadataStyle = getTemplateStyle(metadataTemplate!, $templates) || defaultMetadataStyle

    $: messageTemplate = overrideOutput ? $showsCache[slide?.id]?.message?.template : currentStyle.messageTemplate || "message"
    const defaultMessageStyle = "top: 50px;left: 50px;width: 1820px;height: 150px;opacity: 0.8;font-size: 50px;text-shadow: 2px 2px 4px rgb(0 0 0 / 80%);"
    let messageStyle = defaultMessageStyle
    $: messageStyle = getTemplateStyle(messageTemplate!, $templates) || defaultMessageStyle

    $: if (autoMediaMeta) window.api.send(READ_EXIF, { id: background.path })
    // https://www.npmjs.com/package/exif
    window.api.receive(READ_EXIF, (data: any) => {
        if (!autoMediaMeta || !data.exif) return
        // console.log(data)

        metaMessage = {}
        if (data.exif.exif.DateTimeOriginal) metaMessage.taken = "Date: " + data.exif.exif.DateTimeOriginal
        if (data.exif.exif.ApertureValue) metaMessage.aperture = "Aperture: " + data.exif.exif.ApertureValue
        if (data.exif.exif.BrightnessValue) metaMessage.brightness = "Brightness: " + data.exif.exif.BrightnessValue
        if (data.exif.exif.ExposureTime) metaMessage.exposure_time = "Exposure Time: " + data.exif.exif.ExposureTime.toFixed(4)
        if (data.exif.exif.FNumber) metaMessage.fnumber = "F Number: " + data.exif.exif.FNumber
        if (data.exif.exif.Flash) metaMessage.flash = "Flash: " + data.exif.exif.Flash
        if (data.exif.exif.FocalLength) metaMessage.focallength = "Focal Length: " + data.exif.exif.FocalLength
        if (data.exif.exif.ISO) metaMessage.iso = "ISO: " + data.exif.exif.ISO
        if (data.exif.exif.InteropOffset) metaMessage.interopoffset = "Interop Offset: " + data.exif.exif.InteropOffset
        if (data.exif.exif.LightSource) metaMessage.lightsource = "Light Source: " + data.exif.exif.LightSource
        if (data.exif.exif.ShutterSpeedValue) metaMessage.shutterspeed = "Shutter Speed: " + data.exif.exif.ShutterSpeedValue

        if (data.exif.exif.LensMake) metaMessage.lens = "Lens: " + data.exif.exif.LensMake
        if (data.exif.exif.LensModel) metaMessage.lensmodel = "Lens Model: " + data.exif.exif.LensModel

        if (data.exif.gps.GPSLatitude) metaMessage.gps = "Position: " + data.exif.gps.GPSLatitudeRef + data.exif.gps.GPSLatitude[0]
        if (data.exif.gps.GPSLongitude) metaMessage.gps += " " + data.exif.gps.GPSLongitudeRef + data.exif.gps.GPSLongitude[0]
        if (data.exif.gps.GPSAltitude) metaMessage.gps += " " + data.exif.gps.GPSAltitude

        if (data.exif.image.Make) metaMessage.device = "Device: " + data.exif.image.Make
        if (data.exif.image.Model) metaMessage.device += " " + data.exif.image.Model
        if (data.exif.image.Software) metaMessage.software = "Software: " + data.exif.image.Software
    })

    function getTemplateStyle(templateId: string, updater: any) {
        if (!templateId) return
        let template = updater[templateId]
        if (!template) return

        let style = template.items[0]?.style || ""
        let textStyle = template.items[0]?.lines?.[0]?.text?.[0]?.style || ""

        return style + textStyle
    }

    // give time for video to clear
    let tempVideoBG: any = null
    // let getTimeout: any = null
    $: if (background || currentStyle?.backgroundImage) getTempBG()
    else resetTempBG()

    // svelte bug: dont allow path to change while video is transitioning
    let mediaPath: string = ""
    let oldPath: string = ""
    let pathTimeout: any = null
    $: if (background?.path) getPath()
    function getPath() {
        clearTimeout(pathTimeout)

        if (oldPath === background.path) {
            pathTimeout = setTimeout(() => {
                mediaPath = background.path
            }, mediaTransition.duration + 100)
            return
        }

        mediaPath = background.path
        oldPath = mediaPath

        pathTimeout = setTimeout(() => {
            oldPath = ""
        }, mediaTransition.duration + 100)
    }

    function getTempBG() {
        if (clearing) return

        if (!background || !layers.includes("background")) {
            if (!currentStyle?.backgroundImage) {
                tempVideoBG = null
                return
            }

            tempVideoBG = { path: currentStyle?.backgroundImage }
            return
        }

        tempVideoBG = background

        // WIP sync with preview
        // setTimeout(() => {
        //     if (!videoTime) return
        //     send(OUTPUT, ["MAIN_VIDEO"], { id: outputId, time: videoTime, updatePreview: true })
        // }, 1000)
    }

    let clearing: boolean = false
    function resetTempBG() {
        if (tempVideoBG === null) return

        clearing = true
        tempVideoBG = null

        setTimeout(() => {
            clearing = false
            if (background || currentStyle?.backgroundImage) getTempBG()
        }, mediaTransition.duration + 100)
    }

    // fix videoTime resetting to 0 in Preview.svelte
    $: if (tempVideoBG?.type === "player") video = "player"

    // prevent too fast slide text updates (svelte transition bug)
    let slideClone: any = {}
    let slideTimeout: any = null
    $: startSlideTimer(currentSlide)
    function startSlideTimer(_updater) {
        if (slideTimeout !== null) return

        slideTimeout = setTimeout(() => {
            slideClone = clone(currentSlide)
            slideTimeout = null
        }, 50)
    }

    $: slideFilter = ""
    $: if (!slideData?.filterEnabled || slideData?.filterEnabled?.includes("background")) getSlideFilter()
    function getSlideFilter() {
        if (!slideData) return
        slideFilter = ""
        if (slideData.filter) slideFilter += "filter: " + slideData.filter + ";"
        if (slideData["backdrop-filter"]) slideFilter += "backdrop-filter: " + slideData["backdrop-filter"] + ";"
    }

    // OVERLAYS
    let clonedOverlays = {}
    $: if (out.overlays) cloneOverlays()
    function cloneOverlays() {
        clonedOverlays = clone($overlays)
    }
</script>

<Zoomed
    background={currentOutput.isKeyOutput ? "black" : currentSlide?.settings?.color || currentStyle.background || "black"}
    backgroundDuration={mediaTransition?.duration || 800}
    {center}
    {style}
    {resolution}
    {mirror}
    cropping={currentStyle.cropping}
    bind:ratio
>
    {#if tempVideoBG && (layers.includes("background") || currentStyle?.backgroundImage)}
        <div class="media" style="height: 100%;zoom: {1 / ratio};transition: filter {mediaTransition.duration || 800}ms, backdrop-filter {mediaTransition.duration || 800}ms;{slideFilter}" class:key={currentOutput.isKeyOutput}>
            <MediaOutput {...tempVideoBG} background={tempVideoBG} path={mediaPath} {outputId} {currentStyle} transition={mediaTransition} bind:video bind:videoData bind:videoTime bind:title mirror={currentOutput.isKeyOutput || mirror} />
        </div>
    {/if}

    {#if slide && layers.includes("slide")}
        {#key slideClone}
            <!-- WIP svelte transition bug makes output unresponsive (Uncaught TypeError: Cannot read properties of null (reading 'removeChild')) -->
            <!-- svelte transition bug when changing between pages -->
            {#if transition.type === "none"}
                <span style="pointer-events: none;display: block;">
                    {#if slideClone?.items}
                        {#each slideClone?.items as item}
                            {#if !item.bindings?.length || item.bindings.includes(outputId)}
                                <Textbox
                                    filter={slideData?.filterEnabled?.includes("foreground") ? slideData?.filter : ""}
                                    backdropFilter={slideData?.filterEnabled?.includes("foreground") ? slideData?.["backdrop-filter"] : ""}
                                    key={currentOutput.isKeyOutput}
                                    disableListTransition={disableTransitions}
                                    {preview}
                                    {item}
                                    {ratio}
                                    ref={{ showId: slide.id, slideId: slideClone.id, id: slideClone.id }}
                                    {linesStart}
                                    {linesEnd}
                                />
                            {/if}
                        {/each}
                    {/if}
                </span>
            {:else}
                <span transition:custom={transition} style="pointer-events: none;display: block;">
                    {#if slideClone?.items}
                        {#each slideClone?.items as item}
                            {#if !item.bindings?.length || item.bindings.includes(outputId)}
                                <Textbox
                                    filter={slideData?.filterEnabled?.includes("foreground") ? slideData?.filter : ""}
                                    backdropFilter={slideData?.filterEnabled?.includes("foreground") ? slideData?.["backdrop-filter"] : ""}
                                    key={currentOutput.isKeyOutput}
                                    disableListTransition={disableTransitions}
                                    {preview}
                                    {item}
                                    {ratio}
                                    ref={{ showId: slide.id, slideId: slideClone.id, id: slideClone.id }}
                                    {linesStart}
                                    {linesEnd}
                                />
                            {/if}
                        {/each}
                    {/if}
                </span>
            {/if}
        {/key}
    {/if}

    {#if layers.includes("overlays")}
        <!-- message -->
        {#if $showsCache[slide?.id]?.message?.text}
            {#if overlayTransition.type === "none"}
                <div class="meta" style={messageStyle} class:key={currentOutput.isKeyOutput}>
                    {$showsCache[slide?.id]?.message?.text}
                </div>
            {:else}
                <div class="meta" transition:custom={overlayTransition} style={messageStyle} class:key={currentOutput.isKeyOutput}>
                    {$showsCache[slide?.id]?.message?.text}
                </div>
            {/if}
        {/if}
        <!-- metadata -->
        {#if Object.keys($showsCache[slide?.id]?.meta || {}).length && (metadataDisplay === "always" || (metadataDisplay?.includes("first") && slide.index === 0) || (metadataDisplay?.includes("last") && slide.index === currentLayout.length - 1))}
            {#if overlayTransition.type === "none"}
                <div class="meta" style={metadataStyle} class:key={currentOutput.isKeyOutput}>
                    {@html Object.values(metaMessage)
                        .filter((a) => a.length)
                        .join(currentStyle.metadataDivider || "; ")}
                </div>
            {:else}
                <div class="meta" transition:custom={overlayTransition} style={metadataStyle} class:key={currentOutput.isKeyOutput}>
                    {@html Object.values(metaMessage)
                        .filter((a) => a.length)
                        .join(currentStyle.metadataDivider || "; ")}
                </div>
            {/if}
        {/if}
        <!-- overlays -->
        {#if out.overlays?.length}
            {#key out.refresh}
                {#each out.overlays as id}
                    {#if clonedOverlays[id]}
                        {#if overlayTransition.type === "none"}
                            <div class:key={currentOutput.isKeyOutput}>
                                <div>
                                    {#each clonedOverlays[id].items as item}
                                        {#if !item.bindings?.length || item.bindings.includes(outputId)}
                                            <Textbox {item} ref={{ type: "overlay", id }} {preview} {mirror} />
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <div transition:custom={overlayTransition} class:key={currentOutput.isKeyOutput}>
                                <div>
                                    {#each clonedOverlays[id].items as item}
                                        {#if !item.bindings?.length || item.bindings.includes(outputId)}
                                            <Textbox {item} ref={{ type: "overlay", id }} {preview} {mirror} />
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/if}
                {/each}
            {/key}
        {/if}
    {/if}
    {#if mirror || currentOutput.active}
        <Draw />
    {/if}
</Zoomed>

<style>
    .meta {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .key {
        /* filter: brightness(50); */
        filter: grayscale(1) brightness(1000) contrast(100);
        /* filter: invert(1) grayscale(1) brightness(1000); */
    }
</style>

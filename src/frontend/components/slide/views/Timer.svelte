<script lang="ts">
    import type { Item } from "../../../../types/Show"
    import { activeTimers, timers } from "../../../stores"
    import { getCurrentTimerValue } from "../../drawer/timers/timers"
    import { getStyles } from "../../helpers/style"
    // import { blur } from "svelte/transition"
    import { secondsToTime } from "../../helpers/time"

    export let item: null | Item = null
    // export let timer: any = item?.timer
    // export let ref: { type?: "show" | "stage" | "overlay" | "template"; showId?: string; slideId?: string; id: string }
    export let id: string
    export let today: Date
    export let style: string = ""

    $: ref = { id }
    $: timer = $timers[id] || {}

    // TODO: timer stops when leaving window...
    // TODO: update timer type (in editor)

    let times: string[] = []
    let timeValue: string = "00:00"
    let currentTime: number
    // $: currentTime = getCurrentTime()
    $: numberToText(typeof currentTime === "number" ? currentTime : 0)

    $: if (timer) currentTime = getCurrentTimerValue(timer, ref, today, $activeTimers)
    $: console.log(currentTime, $activeTimers, $timers, id, timer)

    function numberToText(time: number) {
        let allTimes: any = secondsToTime(time)

        timeValue = (allTimes.d === 0 ? "" : allTimes.d + ", ") + [allTimes.h === "00" ? "" : allTimes.h, allTimes.m, allTimes.s].join(":")
        while (timeValue[0] === ":") timeValue = timeValue.slice(1, timeValue.length)

        timeValue = timeValue.replace(" :", " ")
    }

    $: min = Math.min(timer.start || 0, timer.end || 0)
    $: max = Math.max(timer.start || 0, timer.end || 0)
    $: percentage = Math.max(0, Math.min(100, ((currentTime - min) / (max - min)) * 100))
    $: itemColor = getStyles(item?.style)?.color || "white"

    $: overflow = getTimerOverflow(currentTime)
    $: negative = timer?.start! > timer?.end!
    function getTimerOverflow(time) {
        if (!timer.overflow || timer.type !== "counter") return false
        if (!timer.overflow) return false
        let start: number = timer.start!
        let end: number = timer.end!

        if (start < end) {
            if (time > end) return true
            return false
        }

        if (time < end) return true
        return false
    }
</script>

{#if item?.timer?.viewType === "line"}
    <div class="line" style="width: {percentage}%;background-color: {itemColor};" />
{:else if item?.timer?.viewType === "circle"}
    <div class="circle" class:mask={item?.timer?.circleMask} style="--percentage: {percentage};--color: {itemColor};" />
{:else}
    <div class="align" style="{style}{item?.align || ''}">
        <div style="display: flex;white-space: nowrap;{overflow ? 'color: ' + (timer.overflowColor || 'red') + ';' : ''}">
            {#if overflow && negative}
                <span>-</span>
            {/if}
            {#if times.length}
                {#each times as ti, i}
                    <div style="position: relative;display: flex;">
                        {#each ti as t}
                            <div>
                                {#key t}
                                    <span style="position: absolute;">{t}</span>
                                    <!-- <span transition:blur={{ duration: 500 }} style="position: absolute;">{t}</span> -->
                                {/key}
                                <span style:opacity={0}>{t}</span>
                            </div>
                        {/each}
                        <!-- style="margin: 0 10px;" -->
                        {#if i % 2 === 0 && i < times.length}<span>:</span>{/if}
                    </div>
                {/each}
            {:else}
                {timeValue}
            {/if}
        </div>
    </div>
{/if}

<style>
    .align {
        display: flex;
        justify-content: center;
        height: 100%;
        align-items: center;
    }

    .line {
        height: 100%;
        background-color: white;
        transition: 0.5s width;
    }

    .circle {
        --percentage: 100;
        --lineWidth: 22px;
        --color: white;

        height: 100%;
        width: 100%;
    }

    /* https://stackoverflow.com/a/6542623 */
    /* @property --percentage {
        initial-value: 100;
        inherits: false;
        syntax: "<*>";
    } */

    .circle:before {
        content: "";
        position: absolute;
        /* transition: 0.5s --percentage; */
        /* border-radius: 50%; */

        inset: 0;
        background: radial-gradient(farthest-side, var(--color) 98%, #0000) top/var(--lineWidth) var(--lineWidth) no-repeat, conic-gradient(var(--color) calc(var(--percentage) * 1%), #0000 0);
        background-size: 0 0, auto;
    }
    .circle.mask:before {
        -webkit-mask: radial-gradient(farthest-side, #0000 calc(99% - var(--lineWidth)), #000 calc(100% - var(--lineWidth)));
        mask: radial-gradient(farthest-side, #0000 calc(99% - var(--lineWidth)), #000 calc(100% - var(--lineWidth)));
    }
</style>

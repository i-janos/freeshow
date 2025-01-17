import { get } from "svelte/store"
import { STORE } from "../../types/Channels"
import { clone } from "../components/helpers/array"
import {
    activeProject,
    alertUpdates,
    audioFolders,
    autoOutput,
    autosave,
    calendarAddShow,
    categories,
    defaultProjectName,
    deletedShows,
    drawSettings,
    drawer,
    drawerTabsData,
    driveData,
    driveKeys,
    events,
    exportPath,
    folders,
    formatNewShow,
    fullColors,
    groupNumbers,
    groups,
    imageExtensions,
    labelsDisabled,
    language,
    lockedOverlays,
    maxConnections,
    media,
    mediaCache,
    mediaFolders,
    mediaOptions,
    midiIn,
    openedFolders,
    os,
    outLocked,
    outputs,
    overlayCategories,
    overlays,
    playerVideos,
    ports,
    presenterControllerKeys,
    projects,
    recordingPath,
    redoHistory,
    remotePassword,
    renamedShows,
    resized,
    saved,
    scripturePath,
    scriptureSettings,
    scriptures,
    scripturesCache,
    shows,
    showsCache,
    showsPath,
    slidesOptions,
    splitLines,
    stageShows,
    styles,
    templateCategories,
    templates,
    textCache,
    theme,
    themes,
    timeFormat,
    timers,
    transitionData,
    undoHistory,
    videoExtensions,
    videoMarkers,
    volume,
    webFavorites,
} from "../stores"
import type { SaveListSettings, SaveListSyncedSettings } from "./../../types/Save"
import { syncDrive } from "./drive"
import { newToast } from "./messages"

export function save() {
    console.log("SAVING...")

    let settings: { [key in SaveListSettings]: any } = {
        initialized: true,
        activeProject: get(activeProject),
        alertUpdates: get(alertUpdates),
        audioFolders: get(audioFolders),
        autoOutput: get(autoOutput),
        maxConnections: get(maxConnections),
        ports: get(ports),
        autosave: get(autosave),
        timeFormat: get(timeFormat),
        defaultProjectName: get(defaultProjectName),
        // events: get(events),
        showsPath: get(showsPath),
        exportPath: get(exportPath),
        scripturePath: get(scripturePath),
        recordingPath: get(recordingPath),
        lockedOverlays: get(lockedOverlays),
        drawer: get(drawer),
        drawerTabsData: get(drawerTabsData),
        groupNumbers: get(groupNumbers),
        fullColors: get(fullColors),
        formatNewShow: get(formatNewShow),
        imageExtensions: get(imageExtensions),
        labelsDisabled: get(labelsDisabled),
        language: get(language),
        mediaFolders: get(mediaFolders),
        mediaOptions: get(mediaOptions),
        openedFolders: get(openedFolders),
        os: get(os),
        outLocked: get(outLocked),
        outputs: get(outputs),
        styles: get(styles),
        presenterControllerKeys: get(presenterControllerKeys),
        playerVideos: get(playerVideos),
        remotePassword: get(remotePassword),
        resized: get(resized),
        slidesOptions: get(slidesOptions),
        splitLines: get(splitLines),
        // templates: get(templates),
        theme: get(theme),
        transitionData: get(transitionData),
        // themes: get(themes),
        videoExtensions: get(videoExtensions),
        webFavorites: get(webFavorites),
        volume: get(volume),
        driveData: get(driveData),
        calendarAddShow: get(calendarAddShow),
    }

    // settings exclusive to the local mashine (path names that shouldn't be synced with cloud)
    let syncedSettings: { [key in SaveListSyncedSettings]: any } = {
        categories: get(categories),
        drawSettings: get(drawSettings),
        groups: get(groups),
        overlayCategories: get(overlayCategories),
        scriptures: get(scriptures),
        scriptureSettings: get(scriptureSettings),
        templateCategories: get(templateCategories),
        timers: get(timers),
        midiIn: get(midiIn),
        videoMarkers: get(videoMarkers),
    }

    let allSavedData: any = {
        path: get(showsPath),
        // SETTINGS
        SETTINGS: settings,
        SYNCED_SETTINGS: syncedSettings,
        // SHOWS
        SHOWS: get(shows),
        STAGE_SHOWS: get(stageShows),
        // STORES
        PROJECTS: { projects: get(projects), folders: get(folders) },
        OVERLAYS: get(overlays),
        TEMPLATES: get(templates),
        EVENTS: get(events),
        MEDIA: get(media),
        THEMES: get(themes),
        DRIVE_API_KEY: get(driveKeys),
        // CACHES SAVED TO MULTIPLE FILES
        showsCache: clone(get(showsCache)),
        scripturesCache: get(scripturesCache),
        deletedShows: clone(get(deletedShows)),
        renamedShows: clone(get(renamedShows)),
    }

    deletedShows.set([])
    renamedShows.set([])

    // CACHES
    allSavedData = {
        ...allSavedData,
        CACHE: { media: get(mediaCache), text: get(textCache) },
        HISTORY: { undo: get(undoHistory), redo: get(redoHistory) },
    }

    window.api.send(STORE, { channel: "SAVE", data: allSavedData })
}

export function saveComplete() {
    saved.set(true)
    newToast("$toast.saved")

    let mainFolderId = get(driveData)?.mainFolderId
    if (!mainFolderId) return
    syncDrive()
}

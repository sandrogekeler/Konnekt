import { useState } from 'react'
import { RestartServer } from '../../../wailsjs/go/main/App'
import { useServerStore } from '../../stores/useServerStore'
import type { TileProps } from '../../types'
import { FileList } from './FileList'
import { EditorPanel } from './EditorPanel'
import { useConfigEditor } from './useConfigEditor'
import { ConfigSummary } from './ConfigSummary'

export function ConfigTile({ serverId, maximized }: TileProps) {
  const { status } = useServerStore()
  const [search, setSearch] = useState('')

  const {
    files,
    loadingFiles,
    listError,
    refresh,
    selectedFile,
    selectedRelPath,
    selectFile,
    content,
    setContent,
    isDirty,
    loadingContent,
    saving,
    saveError,
    save,
    revert,
  } = useConfigEditor(serverId)

  // Summary view when tile is not maximized
  if (!maximized) {
    return <ConfigSummary serverId={serverId} />
  }

  async function handleSaveAndMaybeRestart() {
    await save()
  }

  function handleRestart() {
    RestartServer(serverId).catch(() => {})
  }

  async function handleSelect(relPath: string) {
    if (isDirty && selectedRelPath !== relPath) {
      const ok = window.confirm('You have unsaved changes. Discard and switch files?')
      if (!ok) return
      revert()
    }
    await selectFile(relPath)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* File list panel */}
      <div className="w-52 flex-shrink-0 flex flex-col overflow-hidden">
        <FileList
          files={files}
          selectedRelPath={selectedRelPath}
          dirtyPath={isDirty ? selectedRelPath : null}
          loading={loadingFiles}
          error={listError}
          search={search}
          onSearch={setSearch}
          onSelect={handleSelect}
          onRefresh={refresh}
        />
      </div>

      {/* Editor panel */}
      <EditorPanel
        file={selectedFile}
        content={content}
        onChange={setContent}
        isDirty={isDirty}
        loading={loadingContent}
        saving={saving}
        saveError={saveError}
        isRunning={status.running}
        onSave={handleSaveAndMaybeRestart}
        onRevert={revert}
        onRestart={handleRestart}
      />
    </div>
  )
}

import localforage from 'localforage'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// ─── Store instances ──────────────────────────────────────────────────────────
const metaStore = localforage.createInstance({ name: 'docvault', storeName: 'metadata' })
const fileStore = localforage.createInstance({ name: 'docvault', storeName: 'files' })
const peopleStore = localforage.createInstance({ name: 'docvault', storeName: 'people' })

// ─── Constants ────────────────────────────────────────────────────────────────
export const FOLDERS = ['Identity', 'Education', 'Medical', 'Financial', 'Photos', 'Others']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive initials from a name.
 * Takes the first letter of the first word and the first letter of the last word.
 * Falls back to the first two characters when only one word is present.
 */
function getInitials(name) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Strip characters that are unsafe in ZIP entry paths.
 */
function sanitizePathSegment(segment) {
  return segment.replace(/[/\\?%*:|"<>]/g, '_')
}

/**
 * Iterate every key/value pair in a localforage instance and return them as an array.
 */
async function getAllValues(store) {
  const results = []
  await store.iterate((value) => {
    results.push(value)
  })
  return results
}

// ─── People ───────────────────────────────────────────────────────────────────

/**
 * Add a new person to the vault.
 *
 * @param {string} name
 * @param {string} relationship
 * @param {{ phone?: string, dob?: string, bloodGroup?: string, address?: string }} [profile={}]
 * @returns {Promise<object>} The saved person object.
 */
export async function addPerson(name, relationship, profile = {}) {
  try {
    const id = crypto.randomUUID()
    const person = {
      id,
      name: name.trim(),
      relationship,
      initials: getInitials(name),
      profile: {
        phone: profile.phone ?? '',
        dob: profile.dob ?? '',
        bloodGroup: profile.bloodGroup ?? '',
        address: profile.address ?? '',
      },
      createdAt: new Date().toISOString(),
    }
    await peopleStore.setItem(id, person)
    return person
  } catch (err) {
    throw new Error(`addPerson failed: ${err.message}`)
  }
}

/**
 * Return all people sorted alphabetically by name.
 *
 * @returns {Promise<object[]>}
 */
export async function getPeople() {
  try {
    const people = await getAllValues(peopleStore)
    return people.sort((a, b) => a.name.localeCompare(b.name))
  } catch (err) {
    throw new Error(`getPeople failed: ${err.message}`)
  }
}

/**
 * Merge updates into an existing person record.
 *
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>} The updated person object.
 */
export async function updatePerson(id, updates) {
  try {
    const existing = await peopleStore.getItem(id)
    if (!existing) throw new Error(`Person with id "${id}" not found`)
    const updated = { ...existing, ...updates, id }
    // If name changed, regenerate initials unless caller already supplied them.
    if (updates.name && !updates.initials) {
      updated.initials = getInitials(updates.name)
    }
    await peopleStore.setItem(id, updated)
    return updated
  } catch (err) {
    throw new Error(`updatePerson failed: ${err.message}`)
  }
}

/**
 * Delete a person and all their associated documents (metadata + blobs).
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePerson(id) {
  try {
    // Remove all documents belonging to this person.
    const docs = await getDocsByPerson(id)
    await Promise.all(docs.map((doc) => deleteDocument(doc.id)))
    await peopleStore.removeItem(id)
  } catch (err) {
    throw new Error(`deletePerson failed: ${err.message}`)
  }
}

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * Save a document (blob + metadata) to the vault.
 *
 * @param {Blob} fileBlob
 * @param {string} name       Display name for the document.
 * @param {string} folderName One of FOLDERS.
 * @param {string} personId
 * @param {string} [remark='']
 * @returns {Promise<object>} The saved metadata object.
 */
export async function saveDocument(fileBlob, name, folderName, personId, remark = '') {
  try {
    const id = crypto.randomUUID()
    const metadata = {
      id,
      name,
      fileName: name,
      fileType: fileBlob.type,
      fileSize: fileBlob.size,
      uploadDate: new Date().toISOString(),
      personId,
      folderName,
      remark,
    }
    await metaStore.setItem(id, metadata)
    await fileStore.setItem(id, fileBlob)
    return metadata
  } catch (err) {
    throw new Error(`saveDocument failed: ${err.message}`)
  }
}

/**
 * Return all metadata objects for a given person.
 *
 * @param {string} personId
 * @returns {Promise<object[]>}
 */
export async function getDocsByPerson(personId) {
  try {
    const all = await getAllValues(metaStore)
    return all.filter((doc) => doc.personId === personId)
  } catch (err) {
    throw new Error(`getDocsByPerson failed: ${err.message}`)
  }
}

/**
 * Return all metadata objects across every person.
 *
 * @returns {Promise<object[]>}
 */
export async function getAllDocs() {
  try {
    return await getAllValues(metaStore)
  } catch (err) {
    throw new Error(`getAllDocs failed: ${err.message}`)
  }
}

/**
 * Retrieve the file Blob for a document.
 *
 * @param {string} docId
 * @returns {Promise<Blob|null>}
 */
export async function getDocumentFile(docId) {
  try {
    return await fileStore.getItem(docId)
  } catch (err) {
    throw new Error(`getDocumentFile failed: ${err.message}`)
  }
}

/**
 * Delete a document's metadata and its stored blob.
 *
 * @param {string} docId
 * @returns {Promise<void>}
 */
export async function deleteDocument(docId) {
  try {
    await Promise.all([
      metaStore.removeItem(docId),
      fileStore.removeItem(docId),
    ])
  } catch (err) {
    throw new Error(`deleteDocument failed: ${err.message}`)
  }
}

/**
 * Rename a document (updates the `name` and `fileName` fields in metadata).
 *
 * @param {string} docId
 * @param {string} newName
 * @returns {Promise<object>} The updated metadata object.
 */
export async function renameDocument(docId, newName) {
  try {
    const existing = await metaStore.getItem(docId)
    if (!existing) throw new Error(`Document with id "${docId}" not found`)
    const updated = { ...existing, name: newName, fileName: newName }
    await metaStore.setItem(docId, updated)
    return updated
  } catch (err) {
    throw new Error(`renameDocument failed: ${err.message}`)
  }
}

/**
 * Update the remark field on a document's metadata.
 *
 * @param {string} docId
 * @param {string} remark
 * @returns {Promise<object>} The updated metadata object.
 */
export async function updateRemark(docId, remark) {
  try {
    const existing = await metaStore.getItem(docId)
    if (!existing) throw new Error(`Document with id "${docId}" not found`)
    const updated = { ...existing, remark }
    await metaStore.setItem(docId, updated)
    return updated
  } catch (err) {
    throw new Error(`updateRemark failed: ${err.message}`)
  }
}

/**
 * Check whether a document with the same fileName OR fileSize already exists for
 * the given person. Used before upload to warn the user of potential duplicates.
 *
 * @param {string} personId
 * @param {string} fileName
 * @param {number} fileSize  Size in bytes.
 * @returns {Promise<boolean>}
 */
export async function checkDuplicate(personId, fileName, fileSize) {
  try {
    const docs = await getDocsByPerson(personId)
    return docs.some(
      (doc) => doc.fileName === fileName || doc.fileSize === fileSize
    )
  } catch (err) {
    throw new Error(`checkDuplicate failed: ${err.message}`)
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Compress the entire vault into a ZIP archive and trigger a browser download.
 *
 * Archive structure:
 *   PersonName/FolderName/FileName
 *
 * @returns {Promise<{ success: true, count: number }>}
 */
export async function exportVaultAsZip() {
  try {
    const zip = new JSZip()
    const people = await getPeople()
    let count = 0

    await Promise.all(
      people.map(async (person) => {
        const docs = await getDocsByPerson(person.id)
        await Promise.all(
          docs.map(async (doc) => {
            const blob = await getDocumentFile(doc.id)
            if (!blob) return
            const safePerson = sanitizePathSegment(person.name)
            const safeFolder = sanitizePathSegment(doc.folderName)
            const safeFile = sanitizePathSegment(doc.fileName)
            zip.file(`${safePerson}/${safeFolder}/${safeFile}`, blob)
            count++
          })
        )
      })
    )

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, 'DocVault_Backup.zip')
    return { success: true, count }
  } catch (err) {
    throw new Error(`exportVaultAsZip failed: ${err.message}`)
  }
}

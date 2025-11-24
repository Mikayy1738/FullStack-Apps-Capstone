let _adapter = null;
let _doc = null;

export const useAdapter = (adapter) => {
  _adapter = adapter;
}

export const boot = async () => {
  if (!_adapter) throw new Error("No adapter set. Call useAdapter() first");
  _doc = await _adapter.load();
  return _doc;
}

export const uid = () => {
  return crypto.randomUUID().slice(0, 8);
}

export async function transact(mutatorFn) {
  const d = getDoc();
  mutatorFn(d);
  await _adapter.save(d); // single write-through; adapter stamps rev/updatedAt
  _doc = d; // refresh cache
  return _doc; // return the new canonical doc
}

// Write
export const insertOne = async (col, data) => {
  const d = getDoc();
  if (!d[col]) {
    d[col] = [];
  }
  const rec = {id: uid(), ...data}
  d[col].push(rec);
  await _adapter.save(d);
  _doc = d;
  return rec;
}

// Read
export const getDoc = () => {
  return structuredClone(_doc);
}

export const findMany = (col, pred = () => true) => {
  const doc = getDoc();
  if (!doc[col]) {
    return [];
  }
  return doc[col].filter(pred);
}

export const findOne = (col, pred) => {
  const doc = getDoc();
  if (!doc[col]) {
    return null;
  }
  return doc[col].filter(pred)[0] || null;
}

export function project(row, fields) {
  if (!fields) return row;
  const out = {};
  for (const k of Object.keys(fields)) if (fields[k]) out[k] = row[k];
  return out;
}


export function queryBy(row, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    if ("$in" in v) return v.$in.includes(row[k]);
    if ("$gt" in v) return row[k] > v.$gt;
    if ("$gte" in v) return row[k] >= v.$gte;
    if ("$lt" in v) return row[k] < v.$lt;
    if ("$lte" in v) return row[k] <= v.$lte;
    if ("$ne" in v) return row[k] !== v.$ne;
    if ("$contains" in v) return String(row[k] ?? "").includes(String(v.$contains));
  }
  return row[k] === v;
  });
}

export function findManyBy(col, filter = {}) {
  return getDoc()[col].filter(r => queryBy(r, filter));
}

export function findOneBy(col, filter = {}) {
  return getDoc()[col].find(r => queryBy(r, filter)) ?? null;
}

export function find(col, { filter={}, sort=null, limit=null, skip=0, fields=null }={}) {
  let rows = findManyBy(col, filter);
  if (sort) {
    const [[k, dir]] = Object.entries(sort);
    rows = rows.slice().sort((a,b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (dir === -1 ? -1 : 1));
  }
  if (skip) rows =  rows.slice(skip);
  if (limit) rows =  rows.slice(0, limit);
  if (fields) rows = rows.map(r => project(r, fields));
  return rows;
}


// Update
export const updateOne = async (col, id, patch) => {
  const d = getDoc();
  if (!d[col]) {
    return 0;
  }
  const i = d[col].findIndex(r => r.id === id);
  if (i === -1) {return 0};
  d[col][i] = { ...d[col][i], ...patch };
  await _adapter.save(d);
  _doc = d;
  return 1;
}

export async function updateOneOps(col, id, ops = {}) {
  const row = findOne(col, r => r.id === id);
  if (!row) return 0;
  const patch = {};
  if (ops.$set) Object.assign(patch, ops.$set);
  if (ops.$addToSet) {
    for (const [k, v] of Object.entries(ops.$addToSet)) {
      const cur = Array.isArray(row[k]) ? row[k] : [];
      patch[k] = Array.from(new Set([...cur, ...(Array.isArray(v) ? v : [v])]));
    }
  }
  if (ops.$pull) {
    for (const [k, v] of Object.entries(ops.$pull)) {
      const cur = Array.isArray(row[k]) ? row[k] : [];
      patch[k] = cur.filter(x => x !== v);
    }
  }
  return updateOne(col, id, patch);
}

export async function upsertOne(col, filter, data) {
  const existing = findOneBy(col, filter);
  if (existing) {
    // Update the found record, then re-read and return it
    await updateOne(col, existing.id, data);
    return findOne(col, r => r.id === existing.id);
  }
  else {
    // No match → insert and return the new record
    return insertOne(col, data);
  }
}


// Delete
export const deleteOne =async(col, id) => {
  const d = getDoc();
  const before = d[col].length;
  d[col] = d[col].filter(r => r.id !== id);
  const deleted = before - d[col].length;
  if (deleted) {
  await _adapter.save(d);
  _doc = d;
  }
  return deleted; // 0 or 1
}
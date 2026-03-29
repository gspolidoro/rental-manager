import { supabase } from './supabase'
import type { Property, Category, Transaction } from '../types'

// ── Properties ──────────────────────────────────────────────
export async function getProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Property[]
}

export async function getProperty(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Property
}

export async function createProperty(payload: Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...payload, user_id: user!.id })
    .select()
    .single()
  if (error) throw error
  return data as Property
}

export async function updateProperty(id: string, payload: Partial<Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Property
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ── Categories ───────────────────────────────────────────────
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('type')
    .order('name')
  if (error) throw error
  return data as Category[]
}

export async function createCategory(payload: { name: string; type: 'income' | 'expense' }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...payload, user_id: user!.id })
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function updateCategory(id: string, payload: { name?: string; type?: 'income' | 'expense' }) {
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ── Transactions ─────────────────────────────────────────────
export async function getTransactions(propertyId?: string) {
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*), property:properties(*)')
    .order('date', { ascending: false })
  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Transaction[]
}

export async function createTransaction(payload: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category' | 'property'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id: user!.id })
    .select('*, category:categories(*), property:properties(*)')
    .single()
  if (error) throw error
  return data as Transaction
}

export async function updateTransaction(id: string, payload: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category' | 'property'>>) {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select('*, category:categories(*), property:properties(*)')
    .single()
  if (error) throw error
  return data as Transaction
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export interface Profile {
  id: string
  username: string
  role: 'admin' | 'user'
  created_at: string
}

export interface Property {
  id: string
  user_id: string
  name: string
  address: string | null
  description: string | null
  purchase_price: number | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  created_at: string
}

export interface Transaction {
  id: string
  property_id: string
  category_id: string | null
  user_id: string
  amount: number
  type: 'income' | 'expense'
  description: string | null
  date: string
  receipt_url: string | null
  created_at: string
  updated_at: string
  category?: Category
  property?: Property
}

export interface PropertySummary {
  property: Property
  totalIncome: number
  totalExpenses: number
  netIncome: number
  transactionCount: number
}

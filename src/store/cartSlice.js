import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { cartAPI } from '../api/api'

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await cartAPI.get()
    return data.success ? data.data : rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch cart')
  }
})

export const addToCart = createAsyncThunk('cart/add', async ({ productId, quantity = 1 }, { rejectWithValue }) => {
  try {
    const { data } = await cartAPI.add({ productId, quantity })
    return data.success ? data.data : rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add to cart')
  }
})

export const updateCartItem = createAsyncThunk('cart/update', async ({ itemId, quantity }, { rejectWithValue }) => {
  try {
    const { data } = await cartAPI.update(itemId, { quantity })
    return data.success ? data.data : rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update cart')
  }
})

export const removeCartItem = createAsyncThunk('cart/remove', async (itemId, { rejectWithValue }) => {
  try {
    const { data } = await cartAPI.remove(itemId)
    return data.success ? itemId : rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove item')
  }
})

const recalcTotals = (state) => {
  state.totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0)
  state.subTotal = state.items.reduce((sum, i) => sum + i.totalPrice, 0)
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    subTotal: 0,
    totalItems: 0,
    loading: false,
    adding: false,
  },
  reducers: {
    clearCartState: (state) => {
      state.items = []
      state.subTotal = 0
      state.totalItems = 0
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.loading = true })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.subTotal = action.payload.subTotal
        state.totalItems = action.payload.totalItems
      })
      .addCase(fetchCart.rejected, (state) => { state.loading = false })

      // addToCart — upsert the returned CartItemDto and recalc totals immediately
      .addCase(addToCart.pending, (state) => { state.adding = true })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.adding = false
        const incoming = action.payload
        const idx = state.items.findIndex((i) => i.id === incoming.id)
        if (idx >= 0) {
          state.items[idx] = incoming
        } else {
          state.items.push(incoming)
        }
        recalcTotals(state)
      })
      .addCase(addToCart.rejected, (state) => { state.adding = false })

      // updateCartItem — patch only the fields the API returns; preserve imageUrl etc.
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.items.findIndex((i) => i.id === updated.id)
        if (idx >= 0) {
          const existing = state.items[idx]
          state.items[idx] = {
            ...existing,
            // only overwrite fields that are guaranteed in the response
            quantity: updated.quantity ?? existing.quantity,
            totalPrice: updated.totalPrice ?? existing.totalPrice,
            sellingPrice: updated.sellingPrice ?? existing.sellingPrice,
            // preserve imageUrl / basePrice / discountPercent from initial fetch
            imageUrl: updated.imageUrl || existing.imageUrl,
            basePrice: updated.basePrice || existing.basePrice,
            discountPercent: updated.discountPercent ?? existing.discountPercent,
            stockCount: updated.stockCount ?? existing.stockCount,
          }
        }
        recalcTotals(state)
      })

      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload)
        recalcTotals(state)
      })
  },
})

export const { clearCartState } = cartSlice.actions
export default cartSlice.reducer

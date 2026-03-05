import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { wishlistAPI } from '../api/api'

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await wishlistAPI.get()
    return data.success ? data.data : rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch wishlist')
  }
})

export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (productId, { getState, rejectWithValue }) => {
  const { items } = getState().wishlist
  const exists = items.find((i) => i.productId === productId)
  try {
    if (exists) {
      await wishlistAPI.remove(productId)
      return { removed: true, productId }
    } else {
      const { data } = await wishlistAPI.add(productId)
      return data.success ? { removed: false, item: data.data } : rejectWithValue(data.message)
    }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update wishlist')
  }
})

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: [], loading: false },
  reducers: {
    clearWishlistState: (state) => { state.items = [] },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => { state.loading = true })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchWishlist.rejected, (state) => { state.loading = false })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        if (action.payload.removed) {
          state.items = state.items.filter((i) => i.productId !== action.payload.productId)
        } else {
          state.items.push(action.payload.item)
        }
      })
  },
})

export const { clearWishlistState } = wishlistSlice.actions
export default wishlistSlice.reducer

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '../api/api'

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(credentials)
    if (data.success) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      return data.data
    }
    return rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.register(userData)
    if (data.success) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      return data.data
    }
    return rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed')
  }
})

export const fetchCurrentUser = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.getMe()
    if (data.success) return data.data
    return rejectWithValue(data.message)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => { state.user = action.payload })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null
        state.token = null
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer

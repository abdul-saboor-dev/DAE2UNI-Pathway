import mongoose from 'mongoose'

async function connectDatabase(connectionString) {
  try {
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('MongoDB connection established.')
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`)
  }
}

export default connectDatabase

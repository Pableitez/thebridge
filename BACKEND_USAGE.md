# Backend Integration Guide

## How to Use the Backend

### 1. Start the Backend Server

First, you need to start the backend server:

**Windows:**
```bash
cd backend
start.bat
```

**Linux/Mac:**
```bash
cd backend
./start.sh
```

### 2. Connect to Backend in the Web App

1. Open your web app (`index.html`)
2. Click on the **"Data Versions"** button in the sidebar
3. In the modal that opens, you'll see a new **"Connect to Backend"** button
4. Click **"Connect to Backend"** to connect to your local server
5. You'll see a status message showing if the connection was successful

### 3. Using the Backend

Once connected:
- **Save Data Version**: Versions will be saved to your cloud folder (OneDrive/Google Drive/Dropbox)
- **Load Versions**: You'll see versions from both the backend and local storage
- **Delete Versions**: Versions will be deleted from the cloud folder
- **Export**: Versions can be exported as CSV files

### 4. Configuration

The backend is configured to use these cloud folders:
- **OneDrive**: `C:\Users\[YourUsername]\OneDrive\TheBridge\Versions`
- **Google Drive**: `C:\Users\[YourUsername]\Google Drive\TheBridge\Versions`
- **Dropbox**: `C:\Users\[YourUsername]\Dropbox\TheBridge\Versions`

### 5. Disconnect

To disconnect from the backend and use only local storage:
- Click the **"Disconnect Backend"** button
- The app will fall back to using only localStorage

## Troubleshooting

- **Connection Failed**: Make sure the backend server is running on port 3001
- **No Versions Showing**: Check that your cloud folder exists and is accessible
- **Save Errors**: Verify you have write permissions to your cloud folder

## Benefits

- **Cloud Sync**: Your data versions are automatically synced to your cloud storage
- **Shared Access**: Multiple users can access the same versions through the cloud folder
- **Backup**: Your data is safely backed up in the cloud
- **Fallback**: If the backend is unavailable, the app automatically uses local storage 
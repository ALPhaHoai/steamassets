import axios from 'axios';

const headerName = process.env.API_AUTH_HEADER_NAME;
const headerValue = process.env.API_AUTH_HEADER_VALUE;

if (!headerName || !headerValue) {
    throw new Error('Missing required API authentication header environment variables: API_AUTH_HEADER_NAME and/or API_AUTH_HEADER_VALUE');
}

const customHeaders = headerName && headerValue ? {[headerName]: headerValue} : {};

export const axiosInstance = axios.create({
    baseURL: process.env.ASSET_API_BASE_URL,
    timeout: 60000,
    headers: {
        ...customHeaders,
    },
});


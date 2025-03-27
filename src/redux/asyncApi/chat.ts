import { createAsyncThunk } from "@reduxjs/toolkit";
import axios, { AxiosError, AxiosResponse } from "axios";
import {
  addNewMessage,
  onMetricsCapture,
  onStreaming,
} from "../reducers/chatSlice";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../store";

export interface ApiError {
  message: string;
}

export interface ApiResponse {
  data: any;
  status: string;
  error: string;
}

export interface chatSaveRequest {
  threadID?: string | null;
  userId: any;
  title?: any;
  chatType?: string;
  databaseConnection?: string;
  ragType?: string;
  externalRag?: string;
  question: any;
  answer: any;
  metrics: any;
}

export interface getChatMessagesRequest {
  threadId: string;
}

export interface getChatHistoryRequest {
  email: string;
}

export interface ChatData {
  // chatHistory: any[];
}
export interface simpleChatRequest{
  schemaString ?: string;
}

export const simpleChat = createAsyncThunk<any, simpleChatRequest, { rejectValue: string }>(
  "api/simpleChat",
  async (simpleChatRequest, { rejectWithValue, dispatch, getState }) => {
    console.log("simple chat request", simpleChatRequest);
    
    try {
      const state = getState() as RootState;

      await dispatch(
        addNewMessage({
          role: "assistant",
          content: "",
          metrics: {
            model: state.chat.chatModel,
            temperature: state.chat.chatTemperature,
          },
        })
      );

      // Extracting chat history
      const chatHistory =
        state.chat.currentChat &&
        state.chat.currentChat.map((item) => {
          return { role: item.role, content: item.content };
        });

      const question =
        state.chat.currentChat &&
        state.chat.currentChat[state.chat.currentChat.length - 1].content;

      const model = state.chat.chatModel.value;
      const temperature = state.chat.chatTemperature;

      // Additional parameters for Gemini API
      const isSQL = state.chat.chatType === "data_wizard";

      // Constructing the Gemini API payload
      const payload = {
        contents: [
          {
            parts: [
              {
                text: Array.isArray(question) ? question[0]?.text ?? "" : "",
              },
            ],
          },
        ],
      };
      

      // API call to Google Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDfKacwjcGtcGu17KszTRTfYAAETtpzLxA`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch response from Gemini API");
      }

      const responseData = await response.json();
      
      // Extracting the AI response
      const aiResponse =
        responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received";

      // Dispatch the response to Redux store
      dispatch(onStreaming(aiResponse));

      await dispatch(chatSave());

    } catch (error) {
      const err = error as AxiosError<ApiError>;
      return rejectWithValue(err.response?.data?.message || "An error occurred");
    }
  }
);


export const chatSave = createAsyncThunk<
  ApiResponse,
  void,
  { rejectValue: string }
>("api/chatSave", async (_, { rejectWithValue, getState }) => {
  const state = getState() as RootState;

  let threadTitle: string = "";
  const parsedContentObj =
    state.chat.currentChat &&
    state.chat.currentChat[state.chat.currentChat.length - 2].content;
  if (parsedContentObj === "string") {
    threadTitle = parsedContentObj;
  } else if (Array.isArray(parsedContentObj) && parsedContentObj.length > 0) {
    threadTitle = parsedContentObj[0].text ? parsedContentObj[0].text : "";
  }

  const payload: chatSaveRequest = {
    threadID: state.chat.chatId ? state.chat.chatId : null,
    userId: state.app.userInfo && state.app.userInfo.email,
    title: threadTitle,
    chatType: state.chat.chatType,
    // databaseConnection: null,
    // ragType: state.chat.rag.value,
    // externalRag:null,
    question:
      state.chat.currentChat &&
      state.chat.currentChat[state.chat.currentChat.length - 2].content,
    answer:
      state.chat.currentChat &&
      state.chat.currentChat[state.chat.currentChat?.length - 1].content,
    metrics:
      (state.chat.currentChat &&
        state.chat.currentChat[state.chat.currentChat?.length - 1].metrics) ||
      {},
  };
  try {
    const response: AxiosResponse<ApiResponse> = await axios.post<ApiResponse>(
      `/api/chatSave`,
      payload
    );
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    return rejectWithValue(err.response?.data?.message || "An error occurred");
  }
});

export const getChatHistory = createAsyncThunk<
  ApiResponse,
  getChatHistoryRequest,
  { rejectValue: string }
>("api/chatHistoryGet", async (getChatHistoryRequest, { rejectWithValue }) => {
  try {
    const response: AxiosResponse<ApiResponse> = await axios.post<ApiResponse>(
      `/api/chatHistoryGet`,
      getChatHistoryRequest
    );
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    return rejectWithValue(err.response?.data?.message || "An error occurred");
  }
});

export const getChatMessages = createAsyncThunk<
  ApiResponse,
  getChatMessagesRequest,
  { rejectValue: string }
>(
  "api/chatMessagesGet",
  async (getChatMessagesRequest, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<ApiResponse> =
        await axios.post<ApiResponse>(
          `/api/chatMessagesGet`,
          getChatMessagesRequest
        );
      return response.data;
    } catch (error) {
      const err = error as AxiosError<ApiError>;
      return rejectWithValue(
        err.response?.data?.message || "An error occurred"
      );
    }
  }
);

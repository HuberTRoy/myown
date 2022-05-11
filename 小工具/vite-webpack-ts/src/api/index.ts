import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

// Toast替换为实际的toast组件
const Toast = {
  loading: (text: string) => {
    console.log(text);
  },
  clear: () => {
    console.log("clear");
  },
  fail: (conf: { message: string }) => {
    console.log(conf.message);
  },
};

type Config = AxiosRequestConfig & {
  alert?: boolean;
  loading?: boolean;
  loadingText?: string;
};

type Plugin = {
  request?: (config: Config) => Config;
  response?: (data: AxiosResponse) => AxiosResponse;
};

const instance = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
});

const usePlugin = (plugin: Plugin) => {
  if (plugin.request) {
    instance.interceptors.request.use(plugin.request);
  }

  if (plugin.response) {
    instance.interceptors.response.use(plugin.response);
  }
};

const loadingPlugin: Plugin = {
  request: config => {
    if (config.loading) {
      Toast.loading(config.loadingText || "加载中...");
    }

    return config;
  },
  response: data => {
    const config = data.config as Config;
    if (config.loading) {
      Toast.clear();
    }

    return data;
  },
};

const alertPlugin: Plugin = {
  response: data => {
    const config = data.config as Config;
    if (config.alert === true) {
      Toast.fail({
        message: "这里写从接口取到的错误提示",
      });
    }
    return data;
  },
};

usePlugin(loadingPlugin);
usePlugin(alertPlugin);

export type CommonRes<T = any> = {
  code: number;
  msg: string;
  data: T;
};

type Request<R, T> = (params?: T, config?: Config) => Promise<CommonRes<R>>;
type RequestMethod = <R, T = any>(
  url: string,
  config?: Config
) => Request<R, T>;

const wrapperRequest = (method: Method): RequestMethod => {
  // 默认如果有错误会自动弹出toast，后面也可以关闭。
  return <R, T = any>(url: string, config: Config = { alert: true }) => {
    return (params?: T, requestConfig?: Config) => {
      let realParams = [
        url,
        params,
        {
          ...config,
          ...requestConfig,
        },
      ];
      if (method.toLowerCase() === "get") {
        realParams = [url, { params: params, ...config, ...requestConfig }];
      }

      // 这里axios的定义是<T = any, R = AxiosResponse<T>, D = any>
      // 如果在responseInterceptor里完全修改了返回值，第一个参数是必传的。
      return instance[method]<any, CommonRes<R>>(...realParams);
    };
  };
};

export const post = wrapperRequest("post");
export const del = wrapperRequest("delete");
export const put = wrapperRequest("put");
export const get = wrapperRequest("get");

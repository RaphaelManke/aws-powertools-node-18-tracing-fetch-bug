import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Tracer } from "@aws-lambda-powertools/tracer";
import nodeFetch from "node-fetch";
import * as diagnosticsChannel from "diagnostics_channel";

import { Subsegment, Segment } from "aws-xray-sdk-core";

const lambdaTracer = new Tracer();

export class Lambda implements LambdaInterface {
  // Decorate your handler class method

  constructor() {
    addNativeFetchTracing(lambdaTracer);
  }

  @lambdaTracer.captureMethod()
  public async nativeFetch() {
    const response = await fetch("https://api.github.com/users/aws-samples");
    const json = await response.json();
    return json;
  }

  @lambdaTracer.captureMethod()
  public async nodeFetch() {
    const response = await nodeFetch(
      "https://api.github.com/users/aws-samples"
    );
    const json = await response.json();
    return json;
  }

  public async handler(_event: unknown, _context: unknown): Promise<void> {
    await this.nativeFetch();
    await this.nodeFetch();
  }
}

const handlerClass = new Lambda();
export const handler = handlerClass.handler.bind(handlerClass); //

const segments = new Map<
  any,
  { subsegment: Subsegment; parentSubsegment: Segment | Subsegment }
>();

function addNativeFetchTracing(tracer: Tracer) {
  /**
   * This is the first event emitted when a request is created.
   * Based on this event a new subsegment is created.
   * To have a reference to the subsegment created, it is stored in a map.
   */
  diagnosticsChannel
    .channel("undici:request:create")
    .subscribe(({ request }: any) => {
      const parentSubsegment = tracer.getSegment(); // This is the subsegment currently active
      let subsegment;
      if (parentSubsegment) {
        const [_, baseUrl] = request.origin.split("//");

        subsegment = parentSubsegment.addNewSubsegment(baseUrl);
        tracer.setSegment(subsegment);
        subsegment.addAttribute("namespace", "remote");
      }
      segments.set(request, {
        subsegment: subsegment!,
        parentSubsegment: parentSubsegment!,
      });
    });

  /**
   * When the response is received, the response data and headers are added to the subsegment.
   */
  diagnosticsChannel
    .channel("undici:request:headers")
    .subscribe(async ({ request, response }: any) => {
      const { subsegment, parentSubsegment } = segments.get(request)!;

      if (parentSubsegment && subsegment) {
        const [protocol, host] = request.origin.split("//");

        const headers = arrayToObject(response.headers);
        subsegment.addRemoteRequestData(
          {
            ...request,
            host,
            agent: {
              protocol,
            },
          },
          {
            ...response,
            headers: headers,
          }
        );
      }
    });

  /**
   * The subsegment is closed when the response is finished.
   */
  diagnosticsChannel
    .channel("undici:request:trailers")
    .subscribe(({ request }: any) => {
      const { subsegment, parentSubsegment } = segments.get(request)!;

      if (parentSubsegment && subsegment) {
        subsegment.close();
        tracer.setSegment(parentSubsegment);
        segments.delete(request);
      }
    });
}

function arrayToObject(arr: any[]): { [key: string]: any } {
  const result: { [key: string]: any } = {};

  if (arr.length % 2 !== 0) {
    throw new Error("Array length should be even to form key-value pairs.");
  }

  for (let i = 0; i < arr.length; i += 2) {
    const key = arr[i].toString().toLowerCase();
    const value = arr[i + 1].toString();
    result[key] = value;
  }

  return result;
}

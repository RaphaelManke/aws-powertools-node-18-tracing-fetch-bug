import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Tracer } from "@aws-lambda-powertools/tracer";
import nodeFetch from "node-fetch";

const tracer = new Tracer();

class Lambda implements LambdaInterface {
  // Decorate your handler class method

  @tracer.captureMethod()
  private async nativeFetch() {
    const response = await fetch("https://api.github.com/users/aws-samples");
    const json = await response.json();
    return json;
  }

  @tracer.captureMethod()
  private async nodeFetch() {
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

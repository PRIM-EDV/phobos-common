import { Controller, Get, OnModuleInit, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { JSDOM } from "jsdom";

import { readFileSync } from 'node:fs'
import { join } from 'node:path';

const BASE_PATH = process.env.BASE_PATH || '';

@Controller()
export class IndexController implements OnModuleInit {
  private indexHtmlDom?: JSDOM;

  async onModuleInit() {
    try {
      this.indexHtmlDom = this.loadIndexHtmlDom();
    } catch (error) {
      console.error("Error loading index.html:", error);
    }
  }

  @Get('index.html')
  getIndexHtml(@Req() req: Request, @Res() res: Response) {
    if (this.indexHtmlDom) {
      const document = this.replaceBaseHref(this.indexHtmlDom, BASE_PATH);
      res.send(document.serialize());
    } else {
      res.status(500).send("Index document not loaded");
    }
  }

  private loadIndexHtmlDom(): JSDOM {
    const filePath = join(process.cwd(), 'dist/public/index.html');
    const rawHtml = readFileSync(filePath, 'utf8');

    return new JSDOM(rawHtml);;
  }

  private replaceBaseHref(html: JSDOM, baseUrl: string): JSDOM {
    const baseElement = html.window.document.querySelector('base');
    if (baseElement) {
      baseElement.setAttribute('href', baseUrl);
    }
    return html;
  }
}
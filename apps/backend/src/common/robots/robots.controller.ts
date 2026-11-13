import { Controller, Get, Header } from '@nestjs/common';

/** The API's whole `robots.txt`: nothing on its host is for crawlers. */
export const API_ROBOTS = 'User-agent: *\nDisallow: /\n';

/**
 * `robots.txt` at the root of the API's own host (`api.<domain>`), which no crawler should read: the API serves the
 * frontend's server, never a page. Public and anonymous, like the health checks; every answer of the API
 * also carries `X-Robots-Tag: noindex, nofollow` (`main.ts`), for crawlers that skip this file.
 */
@Controller()
export class RobotsController {
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  robots() {
    return API_ROBOTS;
  }
}

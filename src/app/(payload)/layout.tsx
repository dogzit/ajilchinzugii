/* THIS FILE IS PART OF THE PAYLOAD ADMIN. Keep it close to the upstream template. */
import type { ServerFunctionClient } from 'payload';
import config from '@payload-config';
// The admin panel's own stylesheet. Without it the panel renders as raw HTML.
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import React from 'react';
import { importMap } from './admin/importMap';
import './custom.css';

type Args = {
  children: React.ReactNode;
};

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;

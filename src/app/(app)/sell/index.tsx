import { Redirect } from 'expo-router';
import React from 'react';

/** `/sell` is the tab's address; the wizard itself starts at photos. */
export default function SellIndex() {
  return <Redirect href="/sell/photos" />;
}

import {StoryObj, Meta} from '@storybook/react';

import Toaster from './toaster';

export default {
  title: 'toaster',
  component: Toaster,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof Toaster>;

type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  args: {},
};

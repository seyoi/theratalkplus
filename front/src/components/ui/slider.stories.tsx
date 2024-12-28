import {StoryObj, Meta} from '@storybook/react';

import slider from './slider';

export default {
  title: 'slider',
  component: slider,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof slider>;

type Story = StoryObj<typeof slider>;

export const Default: Story = {
  args: {},
};

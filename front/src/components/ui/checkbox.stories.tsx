import {StoryObj, Meta} from '@storybook/react';

import { checkbox } from './checkbox';

export default {
  title: 'checkbox',
  component: checkbox,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof checkbox>;

type Story = StoryObj<typeof checkbox>;

export const Default: Story = {
  args: {},
};

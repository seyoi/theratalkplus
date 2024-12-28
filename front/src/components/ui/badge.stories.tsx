import {StoryObj, Meta} from '@storybook/react';

import Badge from './badge';

export default {
  title: 'badge',
  component: Badge,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof Badge>;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {},
};

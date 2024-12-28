import {StoryObj, Meta} from '@storybook/react';

import Announcement from './announcement';

export default {
  title: 'announcement',
  component: Announcement,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof Announcement>;

type Story = StoryObj<typeof Announcement>;

export const Default: Story = {
  args: {},
};

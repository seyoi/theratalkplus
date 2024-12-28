import {StoryObj, Meta} from '@storybook/react';

import popover from './popover';

export default {
  title: 'popover',
  component: popover,
  args: {
    
  },
} as Meta<typeof popover>;

type Story = StoryObj<typeof popover>;

export const Default: Story = {
  args: {},
};

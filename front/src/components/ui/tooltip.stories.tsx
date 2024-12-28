import {StoryObj, Meta} from '@storybook/react';

import tooltip from './tooltip';

export default {
  title: 'tooltip',
  component: tooltip,
  args: {
    
  },
} as Meta<typeof tooltip>;

type Story = StoryObj<typeof tooltip>;

export const Default: Story = {
  args: {},
};

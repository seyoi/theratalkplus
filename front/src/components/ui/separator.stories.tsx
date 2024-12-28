import {StoryObj, Meta} from '@storybook/react';

import separator from './separator';

export default {
  title: 'separator',
  component: separator,
  args: {
    
  },
} as Meta<typeof separator>;

type Story = StoryObj<typeof separator>;

export const Default: Story = {
  args: {},
};

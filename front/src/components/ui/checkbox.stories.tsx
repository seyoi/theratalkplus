import {StoryObj, Meta} from '@storybook/react';

import Checkbox   from './checkbox';

export default {
  title: 'checkbox',
  component: Checkbox,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof Checkbox>;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {},
};

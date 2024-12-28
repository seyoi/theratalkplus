import {StoryObj, Meta} from '@storybook/react';

import Input from './input';

export default {
  title: 'input',
  component: Input,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof Input>;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {},
};

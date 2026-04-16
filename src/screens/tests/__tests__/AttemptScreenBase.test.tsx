import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AttemptScreenBase } from '../AttemptScreenBase';

describe('AttemptScreenBase', () => {
  test('submits answers when pressing Submit on last question', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onExitRequested = jest.fn();

    const { getByText } = render(
      <AttemptScreenBase
        title="Demo test"
        startedAt={new Date().toISOString()}
        questions={[
          {
            id: 'q1',
            type: 3,
            questionText: 'Type something',
          },
        ]}
        onSubmit={onSubmit}
        onExitRequested={onExitRequested}
      />
    );

    fireEvent.press(getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith([]);
    });
  });

  test('captures text answer before submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText } = render(
      <AttemptScreenBase
        title="Demo test"
        startedAt={new Date().toISOString()}
        questions={[
          {
            id: 'q1',
            type: 3,
            questionText: 'Type something',
          },
        ]}
        onSubmit={onSubmit}
        onExitRequested={() => {}}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Type your answer…'), 'hello');
    fireEvent.press(getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith([{ questionId: 'q1', textAnswer: 'hello' }]);
    });
  });
});

